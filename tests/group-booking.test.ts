/**
 * Integration tests for group sessions (invite friends to co-join a booking).
 * Creates a host + three other clients, makes friendships, books a real slot,
 * and exercises capacity — including a concurrent accept for the last seat.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDb } from "@/lib/db";
import { registerAction } from "@/modules/identity/actions/register";
import { users } from "@/modules/identity/db/schema";
import { availabilitySlots, therapists } from "@/modules/therapists/db/schema";
import { bookings } from "@/modules/booking/db/schema";
import { createBooking } from "@/modules/booking/lib/create-booking";
import { setGroupCapacity } from "@/modules/booking/lib/set-group-capacity";
import { inviteToBooking } from "@/modules/booking/lib/invite-to-booking";
import { respondToBookingInvite } from "@/modules/booking/lib/respond-to-booking-invite";
import { leaveBooking } from "@/modules/booking/lib/leave-booking";
import { listBookingsForClient } from "@/modules/booking/queries/list-bookings-for-client";
import { sendFriendRequest } from "@/modules/friends/lib/send-friend-request";
import { respondToRequest } from "@/modules/friends/lib/respond-to-request";
import { findFriendship } from "@/modules/friends/lib/friendship-status";

const PW = "correct-horse-battery-staple";
const TAG = Math.random().toString(36).slice(2, 8);

let aliceId: string; // host
let bobId: string; // friend
let carolId: string; // friend
let daveId: string; // NOT a friend
let slotId: string;
let bookingId: string;

async function registerClient(label: string): Promise<string> {
  const db = getDb();
  const email = `grp-${label}-${Date.now()}-${TAG}@example.com`;
  const reg = await registerAction({
    name: `GrpTest ${label} ${TAG}`,
    email,
    password: PW,
    confirmPassword: PW,
    consent: true,
  });
  if (!reg.ok) throw new Error(`register ${label} failed: ${reg.error}`);
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!row) throw new Error(`no user row for ${label}`);
  return row.id;
}

async function makeFriends(a: string, b: string): Promise<void> {
  const db = getDb();
  await sendFriendRequest({ requesterId: a, addresseeId: b });
  const fr = await findFriendship(db, a, b);
  await respondToRequest({ userId: b, friendshipId: fr!.id, decision: "accept" });
}

beforeAll(async () => {
  const db = getDb();
  aliceId = await registerClient("alice");
  bobId = await registerClient("bob");
  carolId = await registerClient("carol");
  daveId = await registerClient("dave");

  await makeFriends(aliceId, bobId);
  await makeFriends(aliceId, carolId);

  // Active therapist + our OWN dedicated future slot (avoids slot contention
  // with the other suites that also book seeded slots).
  const [ther] = await db
    .select({ id: therapists.id })
    .from(therapists)
    .where(eq(therapists.status, "active"))
    .limit(1);
  if (!ther) throw new Error("No active therapist in seed data.");

  slotId = uuidv7();
  const start = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(availabilitySlots).values({
    id: slotId,
    therapistId: ther.id,
    startsAt: start,
    endsAt: new Date(start.getTime() + 60 * 60 * 1000),
    isBooked: false,
  });

  const booked = await createBooking({ clientId: aliceId, slotId });
  if (!booked.ok) throw new Error(`booking setup failed: ${booked.error}`);
  bookingId = booked.bookingId;
});

afterAll(async () => {
  try {
    const db = getDb();
    if (bookingId) await db.delete(bookings).where(eq(bookings.id, bookingId));
    if (slotId) {
      await db.delete(availabilitySlots).where(eq(availabilitySlots.id, slotId));
    }
    for (const id of [aliceId, bobId, carolId, daveId]) {
      if (id) await db.delete(users).where(eq(users.id, id));
    }
  } catch (err) {
    console.warn("[group-booking.test] cleanup failed:", err);
  }
});

describe("group bookings", () => {
  it("only the host can set group capacity", async () => {
    expect(
      (await setGroupCapacity({ hostUserId: bobId, bookingId, capacity: 3 })).ok,
    ).toBe(false);
    expect(
      (await setGroupCapacity({ hostUserId: aliceId, bookingId, capacity: 3 })).ok,
    ).toBe(true);
  });

  it("invites must be friends and not yourself", async () => {
    expect(
      (await inviteToBooking({ hostUserId: aliceId, bookingId, inviteeUserId: daveId })).ok,
    ).toBe(false); // not a friend
    expect(
      (await inviteToBooking({ hostUserId: aliceId, bookingId, inviteeUserId: aliceId })).ok,
    ).toBe(false); // self
    expect(
      (await inviteToBooking({ hostUserId: aliceId, bookingId, inviteeUserId: bobId })).ok,
    ).toBe(true);
  });

  it("a guest who accepts sees the session in their list", async () => {
    const r = await respondToBookingInvite({
      userId: bobId,
      bookingId,
      decision: "accept",
    });
    expect(r.ok).toBe(true);
    const bobSessions = await listBookingsForClient(bobId);
    const row = bobSessions.find((s) => s.id === bookingId);
    expect(row).toBeDefined();
    expect(row?.role).toBe("guest");
  });

  it("leaving frees the guest's seat", async () => {
    expect((await leaveBooking({ userId: bobId, bookingId })).ok).toBe(true);
    const bobSessions = await listBookingsForClient(bobId);
    expect(bobSessions.some((s) => s.id === bookingId)).toBe(false);
  });

  it("enforces capacity when two guests race for the last seat", async () => {
    // Open two invites under capacity 3, then shrink to a single guest seat.
    await setGroupCapacity({ hostUserId: aliceId, bookingId, capacity: 3 });
    expect(
      (await inviteToBooking({ hostUserId: aliceId, bookingId, inviteeUserId: bobId })).ok,
    ).toBe(true);
    expect(
      (await inviteToBooking({ hostUserId: aliceId, bookingId, inviteeUserId: carolId })).ok,
    ).toBe(true);
    await setGroupCapacity({ hostUserId: aliceId, bookingId, capacity: 2 });

    const [a, b] = await Promise.all([
      respondToBookingInvite({ userId: bobId, bookingId, decision: "accept" }),
      respondToBookingInvite({ userId: carolId, bookingId, decision: "accept" }),
    ]);
    const successes = [a, b].filter((r) => r.ok).length;
    expect(successes).toBe(1);
  });
});
