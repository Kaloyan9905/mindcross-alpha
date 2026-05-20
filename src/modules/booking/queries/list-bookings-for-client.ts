import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { therapists } from "@/modules/therapists/db/schema";
import type { BookingStatus } from "../db/schema";
import { bookings } from "../db/schema";

/**
 * A client's booking joined with the therapist's public display fields.
 * Shaped for the client account page: the consumer can split this list into
 * upcoming vs. past by comparing `startsAt` to now, or by `status`.
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
}

/** Defensive cap — a single client is unlikely to exceed this. */
const MAX_CLIENT_BOOKINGS = 200;

/**
 * List all bookings belonging to `clientId`, newest session first.
 */
export async function listBookingsForClient(
  clientId: string,
): Promise<ClientBookingRow[]> {
  const db = getDb();

  return db
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      joinUrl: bookings.joinUrl,
      therapistId: therapists.id,
      therapistDisplayName: therapists.displayName,
      therapistSlug: therapists.slug,
      therapistPhotoUrl: therapists.photoUrl,
    })
    .from(bookings)
    .innerJoin(therapists, eq(bookings.therapistId, therapists.id))
    .where(eq(bookings.clientId, clientId))
    .orderBy(desc(bookings.startsAt))
    .limit(MAX_CLIENT_BOOKINGS);
}
