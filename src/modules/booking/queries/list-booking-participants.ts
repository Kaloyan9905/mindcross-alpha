import { and, eq, gt, inArray, isNull } from "drizzle-orm";
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
  email: string;
  role: "host" | "guest";
  status: ParticipantStatus;
}

type Person = { name: string | null; email: string };

async function peopleFor(ids: string[]): Promise<Map<string, Person>> {
  if (ids.length === 0) return new Map();
  const db = getDb();
  const people = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, ids));
  return new Map(people.map((p) => [p.id, { name: p.name, email: p.email }]));
}

/**
 * The full roster (host + guests) of a session — with names AND emails — for the
 * THERAPIST who owns it, so they can see who is attending a group session.
 * Returns null if the booking isn't theirs. A guest only "counts" once they
 * accept (status === "accepted").
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
  // The host may also have a participant row; don't list them twice.
  const guestsOnly = guests.filter((g) => g.clientId !== bk.clientId);
  const people = await peopleFor([bk.clientId, ...guestsOnly.map((g) => g.clientId)]);
  const host = people.get(bk.clientId);

  const rows: ParticipantRow[] = [
    {
      userId: bk.clientId,
      name: host?.name ?? null,
      email: host?.email ?? "",
      role: "host",
      status: "accepted",
    },
  ];
  for (const g of guestsOnly) {
    const p = people.get(g.clientId);
    rows.push({
      userId: g.clientId,
      name: p?.name ?? null,
      email: p?.email ?? "",
      role: "guest",
      status: g.status,
    });
  }
  return rows;
}

/**
 * Rosters (host + guests, with names + emails) for ALL of a therapist's group
 * sessions, keyed by bookingId — so the dashboard can show, in one place, who is
 * attending each session a client invited friends to. Solo sessions are omitted.
 */
export async function listRostersForTherapist(
  therapistId: string,
): Promise<Map<string, ParticipantRow[]>> {
  const db = getDb();
  const groupBookings = await db
    .select({ id: bookings.id, clientId: bookings.clientId })
    .from(bookings)
    .where(
      and(
        eq(bookings.therapistId, therapistId),
        gt(bookings.groupCapacity, 1),
        isNull(bookings.deletedAt),
      ),
    );
  if (groupBookings.length === 0) return new Map();

  const bookingIds = groupBookings.map((b) => b.id);
  const parts = await db
    .select()
    .from(bookingParticipants)
    .where(inArray(bookingParticipants.bookingId, bookingIds));

  const ids = new Set<string>();
  for (const b of groupBookings) ids.add(b.clientId);
  for (const p of parts) ids.add(p.clientId);
  const people = await peopleFor([...ids]);

  const map = new Map<string, ParticipantRow[]>();
  const hostOf = new Map<string, string>();
  for (const b of groupBookings) {
    hostOf.set(b.id, b.clientId);
    const host = people.get(b.clientId);
    map.set(b.id, [
      {
        userId: b.clientId,
        name: host?.name ?? null,
        email: host?.email ?? "",
        role: "host",
        status: "accepted",
      },
    ]);
  }
  for (const p of parts) {
    if (p.clientId === hostOf.get(p.bookingId)) continue; // don't list the host twice
    const person = people.get(p.clientId);
    map.get(p.bookingId)?.push({
      userId: p.clientId,
      name: person?.name ?? null,
      email: person?.email ?? "",
      role: "guest",
      status: p.status,
    });
  }
  return map;
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
  const people = await peopleFor(guests.map((g) => g.clientId));

  return guests.map((g) => {
    const p = people.get(g.clientId);
    return {
      userId: g.clientId,
      name: p?.name ?? null,
      email: p?.email ?? "",
      role: "guest" as const,
      status: g.status,
    };
  });
}
