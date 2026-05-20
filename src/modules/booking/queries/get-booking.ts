import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { therapists } from "@/modules/therapists/db/schema";
import type { BookingStatus } from "../db/schema";
import { bookings } from "../db/schema";

/**
 * Full detail for a single booking — every booking column plus the joined
 * client identity and therapist display fields. Used by detail / confirmation
 * views. Authorization is the caller's responsibility.
 */
export interface BookingDetail {
  id: string;
  status: BookingStatus;
  startsAt: Date;
  endsAt: Date;
  joinUrl: string | null;
  clientNotes: string | null;
  therapistNotes: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  slotId: string | null;
  clientId: string;
  clientName: string | null;
  clientEmail: string;
  therapistId: string;
  therapistDisplayName: string;
  therapistSlug: string;
  therapistPhotoUrl: string | null;
}

/**
 * Load a single booking by id, joined with client + therapist display info.
 * Returns `null` when no booking matches.
 */
export async function getBookingById(
  bookingId: string,
): Promise<BookingDetail | null> {
  if (!bookingId) return null;

  const db = getDb();

  const [row] = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      joinUrl: bookings.joinUrl,
      clientNotes: bookings.clientNotes,
      therapistNotes: bookings.therapistNotes,
      cancelledAt: bookings.cancelledAt,
      cancelledBy: bookings.cancelledBy,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      slotId: bookings.slotId,
      clientId: users.id,
      clientName: users.name,
      clientEmail: users.email,
      therapistId: therapists.id,
      therapistDisplayName: therapists.displayName,
      therapistSlug: therapists.slug,
      therapistPhotoUrl: therapists.photoUrl,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.clientId, users.id))
    .innerJoin(therapists, eq(bookings.therapistId, therapists.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  return row ?? null;
}
