import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { therapists } from "@/modules/therapists/db/schema";
import { bookingParticipants, bookings } from "../db/schema";

export interface BookingInviteRow {
  bookingId: string;
  startsAt: Date;
  endsAt: Date;
  therapistDisplayName: string;
  therapistSlug: string;
  hostName: string | null;
  groupCapacity: number;
}

/**
 * Pending group-session invitations for a client — sessions a friend has
 * invited them to (their participant row is still "invited") that are still
 * confirmed and in the future. Surfaced as "Group invitations" in the account.
 */
export async function listBookingInvites(
  clientId: string,
): Promise<BookingInviteRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      bookingId: bookings.id,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      groupCapacity: bookings.groupCapacity,
      hostClientId: bookings.clientId,
      therapistDisplayName: therapists.displayName,
      therapistSlug: therapists.slug,
    })
    .from(bookingParticipants)
    .innerJoin(bookings, eq(bookingParticipants.bookingId, bookings.id))
    .innerJoin(therapists, eq(bookings.therapistId, therapists.id))
    .where(
      and(
        eq(bookingParticipants.clientId, clientId),
        eq(bookingParticipants.status, "invited"),
        eq(bookings.status, "confirmed"),
      ),
    );

  const now = Date.now();
  const future = rows.filter((r) => r.startsAt.getTime() > now);
  if (future.length === 0) return [];

  const hostIds = future.map((r) => r.hostClientId);
  const people = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, hostIds));
  const nameById = new Map(people.map((p) => [p.id, p.name]));

  return future.map((r) => ({
    bookingId: r.bookingId,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    therapistDisplayName: r.therapistDisplayName,
    therapistSlug: r.therapistSlug,
    hostName: nameById.get(r.hostClientId) ?? null,
    groupCapacity: r.groupCapacity,
  }));
}
