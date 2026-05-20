import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { therapists } from "@/modules/therapists/db/schema";
import type { BookingStatus } from "../db/schema";
import { bookings } from "../db/schema";

/**
 * A booking row for the admin bookings dashboard — joined with the client's
 * identity and the therapist's display name. Newest (most recently created)
 * first so the admin sees fresh activity at the top.
 */
export interface AdminBookingRow {
  id: string;
  status: BookingStatus;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
  cancelledAt: Date | null;
  clientId: string;
  clientName: string | null;
  clientEmail: string;
  therapistId: string;
  therapistDisplayName: string;
}

/** Defensive cap for the admin list view. */
const MAX_ADMIN_BOOKINGS = 500;

/**
 * List all bookings across the platform for the admin dashboard, newest
 * created first.
 */
export async function listBookingsAdmin(): Promise<AdminBookingRow[]> {
  const db = getDb();

  return db
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      createdAt: bookings.createdAt,
      cancelledAt: bookings.cancelledAt,
      clientId: users.id,
      clientName: users.name,
      clientEmail: users.email,
      therapistId: therapists.id,
      therapistDisplayName: therapists.displayName,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.clientId, users.id))
    .innerJoin(therapists, eq(bookings.therapistId, therapists.id))
    .orderBy(desc(bookings.createdAt))
    .limit(MAX_ADMIN_BOOKINGS);
}
