"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  THERAPIST_STATUS,
  type TherapistStatus,
  therapists,
} from "@/modules/therapists/db/schema";

/**
 * Input schema for the admin "move a therapist between statuses" action — e.g.
 * pending_review -> active, or active -> paused. `reviewerId` must be the
 * authenticated admin's user id; the admin module enforces the auth check.
 */
const setTherapistStatusSchema = z.object({
  therapistId: z.string().min(1, "therapistId is required"),
  status: z.enum(THERAPIST_STATUS),
  reviewerId: z.string().min(1, "reviewerId is required"),
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
  const parsed = setTherapistStatusSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid status change." };
  }

  const { therapistId, status } = parsed.data;

  try {
    const db = getDb();

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
