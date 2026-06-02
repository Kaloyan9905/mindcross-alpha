import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { bookings } from "../db/schema";

/**
 * Record that a participant has joined the room — the first one wins. Stamps
 * `started_at` once (later calls match no rows and are cheap no-ops). This is
 * what extends a confirmed session's joinable window past the grace period and
 * keeps the no-show scan from later marking it missed. Best-effort: a failure
 * must never disrupt the call, so it swallows errors.
 *
 * The caller (the meeting `syncRoom`) has already verified the user is a member
 * of this booking's room.
 */
export async function markBookingStarted(bookingId: string): Promise<void> {
  if (!bookingId) return;
  try {
    await getDb()
      .update(bookings)
      .set({ startedAt: new Date() })
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.status, "confirmed"),
          isNull(bookings.startedAt),
        ),
      );
  } catch (err) {
    console.error("[booking] markBookingStarted failed:", err);
  }
}
