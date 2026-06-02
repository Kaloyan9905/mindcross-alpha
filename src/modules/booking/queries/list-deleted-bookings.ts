import { and, desc, eq, isNotNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { therapists } from "@/modules/therapists/db/schema";
import type { BookingStatus } from "../db/schema";
import { bookings } from "../db/schema";

const MAX_DELETED = 200;

export interface ClientDeletedBookingRow {
  id: string;
  status: BookingStatus;
  startsAt: Date;
  endsAt: Date;
  deletedAt: Date;
  therapistDisplayName: string;
  therapistSlug: string;
}

/** A client's removed sessions (recycle bin), most recently removed first. */
export async function listDeletedBookingsForClient(
  clientId: string,
): Promise<ClientDeletedBookingRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      deletedAt: bookings.deletedAt,
      therapistDisplayName: therapists.displayName,
      therapistSlug: therapists.slug,
    })
    .from(bookings)
    .innerJoin(therapists, eq(bookings.therapistId, therapists.id))
    .where(and(eq(bookings.clientId, clientId), isNotNull(bookings.deletedAt)))
    .orderBy(desc(bookings.deletedAt))
    .limit(MAX_DELETED);
  // deletedAt is non-null by the WHERE clause; narrow it for the type.
  return rows.map((r) => ({ ...r, deletedAt: r.deletedAt as Date }));
}

export interface TherapistDeletedBookingRow {
  id: string;
  status: BookingStatus;
  startsAt: Date;
  endsAt: Date;
  deletedAt: Date;
  clientName: string | null;
  clientEmail: string;
}

/** A therapist's removed sessions (recycle bin), most recently removed first. */
export async function listDeletedBookingsForTherapist(
  therapistId: string,
): Promise<TherapistDeletedBookingRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      deletedAt: bookings.deletedAt,
      clientName: users.name,
      clientEmail: users.email,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.clientId, users.id))
    .where(and(eq(bookings.therapistId, therapistId), isNotNull(bookings.deletedAt)))
    .orderBy(desc(bookings.deletedAt))
    .limit(MAX_DELETED);
  return rows.map((r) => ({ ...r, deletedAt: r.deletedAt as Date }));
}
