"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { getAdminUser } from "@/modules/admin";
import {
  THERAPIST_STATUS,
  type TherapistStatus,
  therapists,
} from "@/modules/therapists/db/schema";

/**
 * Input schema for the admin "move a therapist between statuses" action — e.g.
 * pending_review -> active, or active -> paused.
 *
 * NOTE: no caller-supplied id. The action self-authorizes via `getAdminUser()`
 * — a `"use server"` function is an independently-invokable endpoint, so the
 * page gate alone does not protect it.
 */
const setTherapistStatusSchema = z.object({
  therapistId: z.string().min(1, "therapistId is required"),
  status: z.enum(THERAPIST_STATUS),
});

/** Parsed status-change input. */
export type SetTherapistStatusInput = z.infer<typeof setTherapistStatusSchema>;

/** Discriminated result for the status-change action. */
export type SetTherapistStatusResult =
  | { ok: true; therapistId: string; status: TherapistStatus }
  | { ok: false; error: string };

/**
 * Admin Server Action: set a therapist's lifecycle status.
 *
 * The target status is validated against the `THERAPIST_STATUS` enum so an
 * unknown value is rejected before touching the DB. `updatedAt` is bumped in
 * app code per the timestamp convention. Returns a discriminated result —
 * expected errors are returned, not thrown.
 */
export async function setTherapistStatusAction(
  input: unknown,
): Promise<SetTherapistStatusResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { ok: false, error: "You are not authorized to change therapist status." };
  }

  const parsed = setTherapistStatusSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid status change." };
  }

  const { therapistId, status } = parsed.data;

  try {
    const db = getDb();

    // A therapist can't host sessions without a join link — block activation
    // until one is set, so clients never book a session that can't happen.
    if (status === "active") {
      const [existing] = await db
        .select({ sessionUrl: therapists.sessionUrl })
        .from(therapists)
        .where(eq(therapists.id, therapistId))
        .limit(1);
      if (!existing) return { ok: false, error: "Therapist not found." };
      if (!existing.sessionUrl) {
        return {
          ok: false,
          error: "Add a video room link to the profile before activating.",
        };
      }
    }

    const updated = await db
      .update(therapists)
      .set({ status, updatedAt: new Date() })
      .where(eq(therapists.id, therapistId))
      .returning({ id: therapists.id });

    if (updated.length === 0) {
      return { ok: false, error: "Therapist not found." };
    }

    return { ok: true, therapistId, status };
  } catch (err) {
    console.error("setTherapistStatusAction failed:", err);
    return {
      ok: false,
      error: "Could not update the therapist status. Please try again.",
    };
  }
}
