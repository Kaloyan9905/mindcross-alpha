import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import {
  bookingParticipants,
  bookings,
  type ParticipantStatus,
} from "../db/schema";

export interface ParticipantRow {
  userId: string;
  name: string | null;
  role: "host" | "guest";
  status: ParticipantStatus;
}

async function namesFor(ids: string[]): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map();
  const db = getDb();
  const people = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, ids));
  return new Map(people.map((p) => [p.id, p.name]));
}

/**
 * The full roster (host + guests) of a session, for the THERAPIST who owns it.
 * Returns null if the booking isn't theirs.
 */
export async function listParticipantsForTherapist(
  bookingId: string,
  therapistId: string,
): Promise<ParticipantRow[] | null> {
  const db = getDb();
  const [bk] = await db
    .select({ clientId: bookings.clientId, therapistId: bookings.therapistId })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!bk || bk.therapistId !== therapistId) return null;

  const guests = await db
    .select()
    .from(bookingParticipants)
    .where(eq(bookingParticipants.bookingId, bookingId));
  const names = await namesFor([bk.clientId, ...guests.map((g) => g.clientId)]);

  const rows: ParticipantRow[] = [
    {
      userId: bk.clientId,
      name: names.get(bk.clientId) ?? null,
      role: "host",
      status: "accepted",
    },
  ];
  for (const g of guests) {
    rows.push({
      userId: g.clientId,
      name: names.get(g.clientId) ?? null,
      role: "guest",
      status: g.status,
    });
  }
  return rows;
}

/** A host's guests on their own session. Returns null if not the host. */
export async function listGuestsForHost(
  bookingId: string,
  hostUserId: string,
): Promise<ParticipantRow[] | null> {
  const db = getDb();
  const [bk] = await db
    .select({ clientId: bookings.clientId })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!bk || bk.clientId !== hostUserId) return null;

  const guests = await db
    .select()
    .from(bookingParticipants)
    .where(eq(bookingParticipants.bookingId, bookingId));
  const names = await namesFor(guests.map((g) => g.clientId));

  return guests.map((g) => ({
    userId: g.clientId,
    name: names.get(g.clientId) ?? null,
    role: "guest" as const,
    status: g.status,
  }));
}
