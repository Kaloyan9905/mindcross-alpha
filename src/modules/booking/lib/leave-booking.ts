import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { bookingParticipants, bookings } from "../db/schema";
import { cancelBooking } from "./cancel-booking";
import type { GroupResult } from "./group-result";

const schema = z.object({
  userId: z.string().min(1),
  bookingId: z.string().min(1),
});
export type LeaveBookingInput = z.infer<typeof schema>;

/**
 * Leave a group session. A guest declines their seat (freeing it). The HOST
 * "leaving" cancels the whole session (routed through `cancelBooking`, which
 * also frees the slot and releases the other guests). Idempotent.
 */
export async function leaveBooking(input: {
  userId: string;
  bookingId: string;
}): Promise<GroupResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { userId, bookingId } = parsed.data;

  const db = getDb();
  const [bk] = await db
    .select({ id: bookings.id, clientId: bookings.clientId })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!bk) return { ok: true };

  if (bk.clientId === userId) {
    const res = await cancelBooking({ bookingId, userId });
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  }

  const [part] = await db
    .select()
    .from(bookingParticipants)
    .where(
      and(
        eq(bookingParticipants.bookingId, bookingId),
        eq(bookingParticipants.clientId, userId),
      ),
    )
    .limit(1);
  if (!part) return { ok: true };
  if (part.status !== "declined") {
    await db
      .update(bookingParticipants)
      .set({ status: "declined", respondedAt: new Date() })
      .where(eq(bookingParticipants.id, part.id));
  }
  return { ok: true };
}
