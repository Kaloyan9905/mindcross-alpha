import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { bookingParticipants, bookings } from "../db/schema";
import { MAX_GROUP_CAPACITY, type GroupResult } from "./group-result";

const schema = z.object({
  hostUserId: z.string().min(1),
  bookingId: z.string().min(1),
  capacity: z.coerce.number().int().min(1).max(MAX_GROUP_CAPACITY),
});
export type SetGroupCapacityInput = z.infer<typeof schema>;

/**
 * Turn a booking into a group session (or resize it). Host-only. The new
 * capacity (host + guests) can't drop below the number who have already
 * accepted. `capacity = 1` reverts it to a solo session.
 */
export async function setGroupCapacity(input: {
  hostUserId: string;
  bookingId: string;
  capacity: number;
}): Promise<GroupResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  const { hostUserId, bookingId, capacity } = parsed.data;

  const db = getDb();
  // Lock the booking row for the read-check-write, the same way invite/accept
  // do — otherwise a concurrent guest accept could slip the accepted count past
  // a capacity we're shrinking and over-subscribe the session by a seat.
  try {
    return await db.transaction(async (tx) => {
      const [bk] = await tx
        .select({
          id: bookings.id,
          clientId: bookings.clientId,
          status: bookings.status,
        })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .for("update")
        .limit(1);

      if (!bk) return { ok: false, error: "Session not found." } as const;
      if (bk.clientId !== hostUserId) {
        return {
          ok: false,
          error: "Only the host can change this session.",
        } as const;
      }
      if (bk.status !== "confirmed") {
        return {
          ok: false,
          error: "You can only change an active session.",
        } as const;
      }

      const [acc] = await tx
        .select({ value: count() })
        .from(bookingParticipants)
        .where(
          and(
            eq(bookingParticipants.bookingId, bookingId),
            eq(bookingParticipants.status, "accepted"),
          ),
        );
      const acceptedGuests = acc?.value ?? 0;
      // Occupied seats = the host (implicit) + accepted guests.
      if (capacity < acceptedGuests + 1) {
        return {
          ok: false,
          error: "Capacity can't be below the number who have already joined.",
        } as const;
      }

      await tx
        .update(bookings)
        .set({ groupCapacity: capacity, updatedAt: new Date() })
        .where(eq(bookings.id, bookingId));
      return { ok: true } as const;
    });
  } catch (err) {
    console.error("[booking] setGroupCapacity failed:", err);
    return { ok: false, error: "We couldn't update the session. Please try again." };
  }
}
