"use server";

import { z } from "zod";
import { uuidv7 } from "uuidv7";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  therapistApplications,
  therapists,
} from "@/modules/therapists/db/schema";
import { uniqueSlug } from "@/modules/therapists/lib/slug";

/**
 * Input schema for an admin reviewing a therapist application. `reviewerId` is
 * required — the admin module must pass the authenticated admin's user id; this
 * action does not itself perform the auth check.
 */
const reviewApplicationSchema = z.object({
  applicationId: z.string().min(1, "applicationId is required"),
  decision: z.enum(["approve", "reject"]),
  reviewerId: z.string().min(1, "reviewerId is required"),
});

/** Parsed review input. */
export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>;

/** Discriminated result for the application-review action. */
export type ReviewApplicationResult =
  | { ok: true; decision: "approve"; therapistId: string; therapistSlug: string }
  | { ok: true; decision: "reject" }
  | { ok: false; error: string };

/**
 * Admin Server Action: approve or reject a therapist application.
 *
 * On `approve`: the application is marked `approved` AND a `therapists` row is
 * created in `pending_review` status, seeded from the application
 * (displayName = fullName; languages / specializations / bio / email /
 * yearsOfExperience copied; slug generated via `uniqueSlug`). Both writes run
 * inside one transaction.
 *
 * On `reject`: the application is marked `rejected`.
 *
 * Idempotency: an application that has already been reviewed (status not
 * `pending` / `info_requested`) is rejected with an error rather than
 * re-processed.
 */
export async function reviewApplicationAction(
  input: unknown,
): Promise<ReviewApplicationResult> {
  const parsed = reviewApplicationSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid review request." };
  }

  const { applicationId, decision, reviewerId } = parsed.data;

  try {
    const db = getDb();

    // Load the application up front: we need its data for the approve path and
    // must confirm it is still in a reviewable state.
    const appRows = await db
      .select()
      .from(therapistApplications)
      .where(eq(therapistApplications.id, applicationId))
      .limit(1);

    const application = appRows[0];
    if (!application) {
      return { ok: false, error: "Application not found." };
    }
    if (
      application.status !== "pending" &&
      application.status !== "info_requested"
    ) {
      return {
        ok: false,
        error: `Application has already been ${application.status}.`,
      };
    }

    const reviewedAt = new Date();

    if (decision === "reject") {
      await db
        .update(therapistApplications)
        .set({ status: "rejected", reviewedAt, reviewedBy: reviewerId })
        .where(eq(therapistApplications.id, applicationId));
      return { ok: true, decision: "reject" };
    }

    // approve: generate a collision-free slug, then write both rows in a txn.
    const slug = await uniqueSlug(application.fullName);
    const therapistId = uuidv7();

    await db.transaction(async (tx) => {
      await tx
        .update(therapistApplications)
        .set({ status: "approved", reviewedAt, reviewedBy: reviewerId })
        .where(eq(therapistApplications.id, applicationId));

      await tx.insert(therapists).values({
        id: therapistId,
        slug,
        displayName: application.fullName,
        email: application.email,
        phone: application.phone ?? null,
        bio: application.shortBio ?? "",
        yearsOfExperience: application.yearsOfExperience ?? 0,
        languages: application.languages,
        specializations: application.specializations,
        status: "pending_review",
        createdAt: reviewedAt,
        updatedAt: reviewedAt,
      });
    });

    return {
      ok: true,
      decision: "approve",
      therapistId,
      therapistSlug: slug,
    };
  } catch (err) {
    console.error("reviewApplicationAction failed:", err);
    return {
      ok: false,
      error: "Could not complete the review. Please try again.",
    };
  }
}
