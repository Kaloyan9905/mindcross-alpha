import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import type { BookingStatus } from "../db/schema";
import { bookings } from "../db/schema";

/**
 * A booking as seen by the therapist who owns it — joined with the client's
 * name/email so the therapist knows who they are meeting. Newest session first.
 * Excludes recycle-binned sessions.
 */
export interface TherapistBookingRow {
  id: string;
  status: BookingStatus;
  startsAt: Date;
  endsAt: Date;
  startedAt: Date | null;
  groupCapacity: number;
  joinUrl: string | null;
  clientNotes: string | null;
  therapistNotes: string | null;
  clientName: string | null;
  clientEmail: string;
}

/** Defensive cap. */
const MAX_THERAPIST_BOOKINGS = 300;

/**
 * List all bookings for `therapistId`, joined with client identity, soonest
 * upcoming sessions first.
 */
export async function listBookingsForTherapist(
  therapistId: string,
): Promise<TherapistBookingRow[]> {
  const db = getDb();
  return db
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      startedAt: bookings.startedAt,
      groupCapacity: bookings.groupCapacity,
      joinUrl: bookings.joinUrl,
      clientNotes: bookings.clientNotes,
      therapistNotes: bookings.therapistNotes,
      clientName: users.name,
      clientEmail: users.email,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.clientId, users.id))
    .where(and(eq(bookings.therapistId, therapistId), isNull(bookings.deletedAt)))
    .orderBy(desc(bookings.startsAt))
    .limit(MAX_THERAPIST_BOOKINGS);
}
