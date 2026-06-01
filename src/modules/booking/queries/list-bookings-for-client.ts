import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { therapists } from "@/modules/therapists/db/schema";
import type { BookingStatus } from "../db/schema";
import { bookingParticipants, bookings } from "../db/schema";

/**
 * A client's booking joined with the therapist's public display fields.
 * Shaped for the client account page: the consumer can split this list into
 * upcoming vs. past by comparing `startsAt` to now, or by `status`.
 *
 * Includes BOTH sessions the client booked themselves (`role: "host"`) and
 * group sessions they were invited to and accepted (`role: "guest"`).
 */
export interface ClientBookingRow {
  id: string;
  status: BookingStatus;
  startsAt: Date;
  endsAt: Date;
  joinUrl: string | null;
  therapistId: string;
  therapistDisplayName: string;
  therapistSlug: string;
  therapistPhotoUrl: string | null;
  groupCapacity: number;
  role: "host" | "guest";
}

/** Defensive cap — a single client is unlikely to exceed this. */
const MAX_CLIENT_BOOKINGS = 200;

const SELECT = {
  id: bookings.id,
  status: bookings.status,
  startsAt: bookings.startsAt,
  endsAt: bookings.endsAt,
  joinUrl: bookings.joinUrl,
  groupCapacity: bookings.groupCapacity,
  therapistId: therapists.id,
  therapistDisplayName: therapists.displayName,
  therapistSlug: therapists.slug,
  therapistPhotoUrl: therapists.photoUrl,
} as const;

/**
 * List all sessions belonging to `clientId` (booked OR joined as a guest),
 * newest session first.
 */
export async function listBookingsForClient(
  clientId: string,
): Promise<ClientBookingRow[]> {
  const db = getDb();

  // Sessions the client owns.
  const owned = await db
    .select(SELECT)
    .from(bookings)
    .innerJoin(therapists, eq(bookings.therapistId, therapists.id))
    .where(eq(bookings.clientId, clientId))
    .orderBy(desc(bookings.startsAt))
    .limit(MAX_CLIENT_BOOKINGS);

  // Group sessions the client accepted an invite to.
  const acceptedRows = await db
    .select({ bookingId: bookingParticipants.bookingId })
    .from(bookingParticipants)
    .where(
      and(
        eq(bookingParticipants.clientId, clientId),
        eq(bookingParticipants.status, "accepted"),
      ),
    );
  const guestBookingIds = acceptedRows.map((r) => r.bookingId);

  const guest =
    guestBookingIds.length > 0
      ? await db
          .select(SELECT)
          .from(bookings)
          .innerJoin(therapists, eq(bookings.therapistId, therapists.id))
          .where(inArray(bookings.id, guestBookingIds))
          .limit(MAX_CLIENT_BOOKINGS)
      : [];

  const rows: ClientBookingRow[] = [
    ...owned.map((r) => ({ ...r, role: "host" as const })),
    ...guest.map((r) => ({ ...r, role: "guest" as const })),
  ];

  return rows
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .slice(0, MAX_CLIENT_BOOKINGS);
}
