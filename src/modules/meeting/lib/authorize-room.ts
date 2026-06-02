import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { bookings, bookingParticipants } from "@/modules/booking/db/schema";
import { therapists } from "@/modules/therapists/db/schema";

export type RoomRole = "host" | "therapist" | "guest";

export interface RoomMembership {
  bookingId: string;
  role: RoomRole;
  status: string;
  startsAt: Date;
  endsAt: Date;
  groupCapacity: number;
  clientId: string;
  therapistUserId: string | null;
}

/**
 * Trusted core: resolve whether `userId` may enter the room for `bookingId`,
 * and in what role. Returns null when the booking doesn't exist or the user is
 * not a member. Membership = the booking's client (host), the therapist behind
 * the booking, or an ACCEPTED group guest. This is re-checked on every
 * signaling call so unfriending / leaving / a cancelled booking cuts access.
 *
 * Like the other module cores, this takes an already-authenticated id and does
 * NOT resolve the session itself — the `"use server"` actions do that.
 */
export async function getRoomMembership(
  bookingId: string,
  userId: string,
): Promise<RoomMembership | null> {
  if (!bookingId || !userId) return null;
  const db = getDb();

  const [booking] = await db
    .select({
      id: bookings.id,
      clientId: bookings.clientId,
      therapistId: bookings.therapistId,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      groupCapacity: bookings.groupCapacity,
    })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) return null;

  const [therapist] = await db
    .select({ userId: therapists.userId })
    .from(therapists)
    .where(eq(therapists.id, booking.therapistId))
    .limit(1);
  const therapistUserId = therapist?.userId ?? null;

  const base = {
    bookingId: booking.id,
    status: booking.status,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    groupCapacity: booking.groupCapacity,
    clientId: booking.clientId,
    therapistUserId,
  };

  if (userId === booking.clientId) return { ...base, role: "host" };
  if (therapistUserId && userId === therapistUserId) {
    return { ...base, role: "therapist" };
  }

  // An accepted group guest?
  const [guest] = await db
    .select({ id: bookingParticipants.id })
    .from(bookingParticipants)
    .where(
      and(
        eq(bookingParticipants.bookingId, bookingId),
        eq(bookingParticipants.clientId, userId),
        eq(bookingParticipants.status, "accepted"),
      ),
    )
    .limit(1);
  if (guest) return { ...base, role: "guest" };

  return null;
}
