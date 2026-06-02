import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { therapists } from "@/modules/therapists/db/schema";
import { bookings } from "../db/schema";

export type RecycleResult = { ok: true; bookingId: string } | { ok: false; error: string };

const recycleSchema = z.object({
  bookingId: z.string().min(1, "A booking is required."),
  userId: z.string().min(1, "A user is required."),
});
export type RecycleInput = z.infer<typeof recycleSchema>;

/** A booking's client or therapist may move it to / from the recycle bin. */
async function authorize(
  bookingId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb();
  const [bk] = await db
    .select({ clientId: bookings.clientId, therapistUserId: therapists.userId })
    .from(bookings)
    .innerJoin(therapists, eq(bookings.therapistId, therapists.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!bk) return { ok: false, error: "Session not found." };
  const allowed =
    bk.clientId === userId || (bk.therapistUserId != null && bk.therapistUserId === userId);
  return allowed
    ? { ok: true }
    : { ok: false, error: "You don't have access to this session." };
}

/**
 * Soft-delete a booking into the recycle bin: hidden from the lists but
 * recoverable. Does NOT change status or free the slot — use `cancelBooking`
 * for that. Idempotent (removing an already-removed booking is a no-op success).
 */
export async function removeBooking(input: RecycleInput): Promise<RecycleResult> {
  const parsed = recycleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  const { bookingId, userId } = parsed.data;

  const auth = await authorize(bookingId, userId);
  if (!auth.ok) return auth;

  try {
    const now = new Date();
    await getDb()
      .update(bookings)
      .set({ deletedAt: now, deletedBy: userId, updatedAt: now })
      .where(and(eq(bookings.id, bookingId), isNull(bookings.deletedAt)));
    return { ok: true, bookingId };
  } catch (err) {
    console.error("[booking] removeBooking failed:", err);
    return { ok: false, error: "Could not remove the session. Please try again." };
  }
}

/** Restore a soft-deleted booking from the recycle bin. Idempotent. */
export async function restoreBooking(input: RecycleInput): Promise<RecycleResult> {
  const parsed = recycleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  const { bookingId, userId } = parsed.data;

  const auth = await authorize(bookingId, userId);
  if (!auth.ok) return auth;

  try {
    await getDb()
      .update(bookings)
      .set({ deletedAt: null, deletedBy: null, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));
    return { ok: true, bookingId };
  } catch (err) {
    console.error("[booking] restoreBooking failed:", err);
    return { ok: false, error: "Could not restore the session. Please try again." };
  }
}
