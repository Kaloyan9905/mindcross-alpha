/**
 * Integration tests for the in-app meeting engine against the live DB:
 * room-access authorization (host / therapist / accepted-guest / outsider) and
 * the Postgres signaling plane (presence discovery + exactly-once delivery).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDb } from "@/lib/db";
import { registerAction } from "@/modules/identity/actions/register";
import { users } from "@/modules/identity/db/schema";
import { therapists } from "@/modules/therapists/db/schema";
import { bookings, bookingParticipants } from "@/modules/booking/db/schema";
import { getRoomMembership } from "@/modules/meeting/lib/authorize-room";
import { syncRoom } from "@/modules/meeting/lib/sync-room";
import { sendMeetingChat } from "@/modules/meeting/lib/send-chat";
import { leaveRoom } from "@/modules/meeting/lib/leave-room";

const PW = "correct-horse-battery-staple";
const TAG = Math.random().toString(36).slice(2, 8);

let clientId: string;
let therapistUserId: string;
let guestId: string;
let invitedGuestId: string;
let outsiderId: string;
let therapistId: string;
let bookingId: string;

async function reg(label: string): Promise<string> {
  const db = getDb();
  const email = `meeting-${label}-${Date.now()}-${TAG}@example.com`;
  const r = await registerAction({
    name: `Meet ${label} ${TAG}`,
    email,
    password: PW,
    confirmPassword: PW,
    consent: true,
  });
  if (!r.ok) throw new Error(`register ${label}: ${r.error}`);
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  return row!.id;
}

beforeAll(async () => {
  const db = getDb();
  clientId = await reg("client");
  guestId = await reg("guest");
  invitedGuestId = await reg("invited");
  outsiderId = await reg("outsider");

  // A therapist login user + public profile.
  therapistUserId = uuidv7();
  await db.insert(users).values({
    id: therapistUserId,
    name: `Dr Meet ${TAG}`,
    email: `meeting-therapist-${Date.now()}-${TAG}@example.com`,
    role: "therapist",
  });
  therapistId = uuidv7();
  await db.insert(therapists).values({
    id: therapistId,
    userId: therapistUserId,
    slug: `meet-${TAG}`,
    displayName: `Dr Meet ${TAG}`,
    email: `meeting-therapist-pub-${TAG}@example.com`,
    bio: "Test therapist.",
    yearsOfExperience: 5,
    status: "active",
  });

  // A confirmed group booking: client (host) + one accepted guest + one invited.
  bookingId = uuidv7();
  const now = new Date();
  await db.insert(bookings).values({
    id: bookingId,
    clientId,
    therapistId,
    startsAt: new Date(now.getTime() + 3_600_000),
    endsAt: new Date(now.getTime() + 7_200_000),
    status: "confirmed",
    groupCapacity: 3,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(bookingParticipants).values([
    { bookingId, clientId, role: "host", status: "accepted" },
    { bookingId, clientId: guestId, role: "guest", status: "accepted" },
    { bookingId, clientId: invitedGuestId, role: "guest", status: "invited" },
  ]);
});

afterAll(async () => {
  const db = getDb();
  try {
    await db.delete(bookings).where(eq(bookings.id, bookingId));
    await db.delete(therapists).where(eq(therapists.id, therapistId));
    for (const id of [clientId, guestId, invitedGuestId, outsiderId, therapistUserId]) {
      if (id) await db.delete(users).where(eq(users.id, id));
    }
  } catch (err) {
    console.warn("[meeting.test] cleanup failed:", err);
  }
});

describe("getRoomMembership", () => {
  it("admits the booking client as host", async () => {
    expect((await getRoomMembership(bookingId, clientId))?.role).toBe("host");
  });
  it("admits the booking's therapist", async () => {
    expect((await getRoomMembership(bookingId, therapistUserId))?.role).toBe("therapist");
  });
  it("admits an accepted group guest", async () => {
    expect((await getRoomMembership(bookingId, guestId))?.role).toBe("guest");
  });
  it("rejects an invited-but-not-accepted guest", async () => {
    expect(await getRoomMembership(bookingId, invitedGuestId)).toBeNull();
  });
  it("rejects an unrelated user", async () => {
    expect(await getRoomMembership(bookingId, outsiderId)).toBeNull();
  });
  it("rejects an unknown booking", async () => {
    expect(await getRoomMembership(`missing-${TAG}`, clientId)).toBeNull();
  });
});

describe("syncRoom signaling", () => {
  it("discovers live peers and delivers a signal exactly once", async () => {
    // Both heartbeat in.
    const a1 = await syncRoom({ bookingId, userId: clientId, displayName: "Client", outgoing: [] });
    expect(a1.ok).toBe(true);
    const t1 = await syncRoom({ bookingId, userId: therapistUserId, displayName: "Therapist", outgoing: [] });
    expect(t1.ok).toBe(true);

    // Client now sees the therapist and sends an offer.
    const a2 = await syncRoom({
      bookingId,
      userId: clientId,
      displayName: "Client",
      outgoing: [{ recipientId: therapistUserId, kind: "signal", payload: "OFFER-1" }],
    });
    expect(a2.ok).toBe(true);
    if (a2.ok) {
      expect(a2.data.peers.some((p) => p.userId === therapistUserId)).toBe(true);
    }

    // Therapist receives it once...
    const t2 = await syncRoom({ bookingId, userId: therapistUserId, displayName: "Therapist", outgoing: [] });
    expect(t2.ok).toBe(true);
    if (t2.ok) {
      expect(t2.data.incoming.map((s) => s.payload)).toContain("OFFER-1");
      expect(t2.data.incoming.find((s) => s.payload === "OFFER-1")?.senderId).toBe(clientId);
    }

    // ...and never again.
    const t3 = await syncRoom({ bookingId, userId: therapistUserId, displayName: "Therapist", outgoing: [] });
    expect(t3.ok).toBe(true);
    if (t3.ok) expect(t3.data.incoming.length).toBe(0);
  });

  it("rejects a non-member trying to sync", async () => {
    const r = await syncRoom({ bookingId, userId: outsiderId, displayName: "Nope", outgoing: [] });
    expect(r.ok).toBe(false);
  });
});

describe("meeting chat (persistent)", () => {
  it("persists a member's message and returns it on the next sync", async () => {
    const id = uuidv7();
    const r = await sendMeetingChat({
      bookingId,
      userId: clientId,
      displayName: "Client",
      id,
      body: "hello room",
    });
    expect(r.ok).toBe(true);

    const s = await syncRoom({ bookingId, userId: therapistUserId, displayName: "T", outgoing: [] });
    expect(s.ok).toBe(true);
    if (s.ok) {
      const msg = s.data.messages.find((m) => m.id === id);
      expect(msg?.body).toBe("hello room");
      expect(msg?.senderId).toBe(clientId);
    }
  });

  it("rejects a non-member sender", async () => {
    const r = await sendMeetingChat({
      bookingId,
      userId: outsiderId,
      displayName: "Nope",
      id: uuidv7(),
      body: "should not save",
    });
    expect(r.ok).toBe(false);
  });
});

describe("leaveRoom", () => {
  it("removes presence and sends a bye to remaining peers", async () => {
    await syncRoom({ bookingId, userId: clientId, displayName: "Client", outgoing: [] });
    await syncRoom({ bookingId, userId: therapistUserId, displayName: "Therapist", outgoing: [] });

    await leaveRoom({ bookingId, userId: clientId });

    const t = await syncRoom({ bookingId, userId: therapistUserId, displayName: "Therapist", outgoing: [] });
    expect(t.ok).toBe(true);
    if (t.ok) {
      expect(t.data.peers.some((p) => p.userId === clientId)).toBe(false);
      expect(t.data.incoming.some((s) => s.kind === "bye" && s.senderId === clientId)).toBe(true);
    }
  });
});
