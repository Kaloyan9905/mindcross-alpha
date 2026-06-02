/**
 * Integration tests for the session grace period + recycle bin against the live
 * DB: started-at tracking, no-show expiry, soft-delete/restore (authorized for
 * client AND therapist), therapist cancel, retention purge, and the therapist
 * participant roster carrying emails.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDb } from "@/lib/db";
import { registerAction } from "@/modules/identity/actions/register";
import { users } from "@/modules/identity/db/schema";
import { availabilitySlots, therapists } from "@/modules/therapists/db/schema";
import { bookings, bookingParticipants, type BookingStatus } from "@/modules/booking/db/schema";
import { markBookingStarted } from "@/modules/booking/lib/mark-booking-started";
import {
  expireMissedSessions,
  purgeDeletedBookings,
} from "@/modules/booking/lib/session-maintenance";
import { removeBooking, restoreBooking } from "@/modules/booking/lib/recycle-booking";
import { cancelBooking } from "@/modules/booking/lib/cancel-booking";
import { listParticipantsForTherapist } from "@/modules/booking/queries/list-booking-participants";
import { listDeletedBookingsForClient } from "@/modules/booking/queries/list-deleted-bookings";
import { listBookingsForClient } from "@/modules/booking/queries/list-bookings-for-client";

const PW = "correct-horse-battery-staple";
const TAG = Math.random().toString(36).slice(2, 8);

let clientId: string;
let guestId: string;
let outsiderId: string;
let therapistUserId: string;
let therapistId: string;

const NOW = Date.now();
const min = (m: number) => new Date(NOW + m * 60_000);
const days = (d: number) => new Date(NOW + d * 86_400_000);

async function reg(label: string): Promise<string> {
  const db = getDb();
  const email = `life-${label}-${Date.now()}-${TAG}@example.com`;
  const r = await registerAction({ name: `Life ${label} ${TAG}`, email, password: PW, confirmPassword: PW, consent: true });
  if (!r.ok) throw new Error(`register ${label}: ${r.error}`);
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  return row!.id;
}

async function mkBooking(opts: {
  startsAt: Date;
  endsAt?: Date;
  status?: BookingStatus;
  startedAt?: Date | null;
  deletedAt?: Date | null;
  slotId?: string | null;
  groupCapacity?: number;
}): Promise<string> {
  const db = getDb();
  const id = uuidv7();
  await db.insert(bookings).values({
    id,
    clientId,
    therapistId,
    slotId: opts.slotId ?? null,
    startsAt: opts.startsAt,
    endsAt: opts.endsAt ?? new Date(opts.startsAt.getTime() + 45 * 60_000),
    status: opts.status ?? "confirmed",
    startedAt: opts.startedAt ?? null,
    deletedAt: opts.deletedAt ?? null,
    groupCapacity: opts.groupCapacity ?? 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

async function statusOf(id: string): Promise<string | undefined> {
  const [r] = await getDb().select({ status: bookings.status }).from(bookings).where(eq(bookings.id, id)).limit(1);
  return r?.status;
}

beforeAll(async () => {
  const db = getDb();
  clientId = await reg("client");
  guestId = await reg("guest");
  outsiderId = await reg("outsider");

  therapistUserId = uuidv7();
  await db.insert(users).values({
    id: therapistUserId,
    name: `Dr Life ${TAG}`,
    email: `life-therapist-${Date.now()}-${TAG}@example.com`,
    role: "therapist",
  });
  therapistId = uuidv7();
  await db.insert(therapists).values({
    id: therapistId,
    userId: therapistUserId,
    slug: `life-${TAG}`,
    displayName: `Dr Life ${TAG}`,
    email: `life-therapist-pub-${TAG}@example.com`,
    bio: "Test.",
    yearsOfExperience: 5,
    status: "active",
  });
});

afterAll(async () => {
  const db = getDb();
  try {
    // Deleting the therapist cascades its bookings + availability slots.
    await db.delete(therapists).where(eq(therapists.id, therapistId));
    for (const id of [clientId, guestId, outsiderId, therapistUserId]) {
      if (id) await db.delete(users).where(eq(users.id, id));
    }
  } catch (err) {
    console.warn("[session-lifecycle.test] cleanup failed:", err);
  }
});

describe("markBookingStarted", () => {
  it("stamps started_at once, and never on a non-confirmed session", async () => {
    const id = await mkBooking({ startsAt: min(-5) });
    await markBookingStarted(id);
    const [a] = await getDb().select({ startedAt: bookings.startedAt }).from(bookings).where(eq(bookings.id, id)).limit(1);
    expect(a?.startedAt).toBeInstanceOf(Date);
    const first = a!.startedAt!.getTime();
    await markBookingStarted(id); // no-op (already set)
    const [b] = await getDb().select({ startedAt: bookings.startedAt }).from(bookings).where(eq(bookings.id, id)).limit(1);
    expect(b!.startedAt!.getTime()).toBe(first);

    const noShow = await mkBooking({ startsAt: min(-30), status: "no_show" });
    await markBookingStarted(noShow);
    const [c] = await getDb().select({ startedAt: bookings.startedAt }).from(bookings).where(eq(bookings.id, noShow)).limit(1);
    expect(c?.startedAt).toBeNull();
  });
});

describe("expireMissedSessions (grace)", () => {
  it("marks past-grace unattended sessions no_show, and leaves the rest", async () => {
    const missed = await mkBooking({ startsAt: min(-30) }); // past grace, no start
    const inGrace = await mkBooking({ startsAt: min(-5) }); // within 10m grace
    const attended = await mkBooking({ startsAt: min(-30), startedAt: min(-28) });
    const removed = await mkBooking({ startsAt: min(-30), deletedAt: min(-1) });

    const count = await expireMissedSessions(new Date(NOW));
    expect(count).toBeGreaterThanOrEqual(1);

    expect(await statusOf(missed)).toBe("no_show");
    expect(await statusOf(inGrace)).toBe("confirmed");
    expect(await statusOf(attended)).toBe("confirmed");
    expect(await statusOf(removed)).toBe("confirmed");
  });
});

describe("recycle bin (remove / restore)", () => {
  it("client removes + restores; hidden from the live list while removed", async () => {
    const id = await mkBooking({ startsAt: min(120) });

    const r1 = await removeBooking({ bookingId: id, userId: clientId });
    expect(r1.ok).toBe(true);
    expect((await listBookingsForClient(clientId)).some((b) => b.id === id)).toBe(false);
    expect((await listDeletedBookingsForClient(clientId)).some((b) => b.id === id)).toBe(true);

    const r2 = await restoreBooking({ bookingId: id, userId: clientId });
    expect(r2.ok).toBe(true);
    expect((await listBookingsForClient(clientId)).some((b) => b.id === id)).toBe(true);
  });

  it("the therapist may also remove; an outsider may not", async () => {
    const id = await mkBooking({ startsAt: min(120) });
    expect((await removeBooking({ bookingId: id, userId: outsiderId })).ok).toBe(false);
    expect((await removeBooking({ bookingId: id, userId: therapistUserId })).ok).toBe(true);
  });
});

describe("cancel by therapist", () => {
  it("lets the therapist cancel and frees the slot, even inside the 1h window", async () => {
    const db = getDb();
    const slotId = uuidv7();
    await db.insert(availabilitySlots).values({
      id: slotId,
      therapistId,
      startsAt: min(30),
      endsAt: min(75),
      isBooked: true,
      createdAt: new Date(),
    });
    const id = await mkBooking({ startsAt: min(30), slotId }); // <1h away

    const r = await cancelBooking({ bookingId: id, userId: therapistUserId });
    expect(r.ok).toBe(true);
    expect(await statusOf(id)).toBe("cancelled");
    const [slot] = await db.select({ isBooked: availabilitySlots.isBooked }).from(availabilitySlots).where(eq(availabilitySlots.id, slotId)).limit(1);
    expect(slot?.isBooked).toBe(false);
  });
});

describe("purgeDeletedBookings (retention)", () => {
  it("hard-deletes rows past the retention window, keeps recent ones", async () => {
    const old = await mkBooking({ startsAt: days(-40), deletedAt: days(-31) });
    const recent = await mkBooking({ startsAt: days(-2), deletedAt: days(-2) });

    await purgeDeletedBookings(new Date(NOW));

    expect(await statusOf(old)).toBeUndefined(); // gone
    expect(await statusOf(recent)).toBeDefined(); // kept
  });
});

describe("therapist roster", () => {
  it("returns host + accepted guest with emails", async () => {
    const id = await mkBooking({ startsAt: min(120), groupCapacity: 2 });
    await getDb().insert(bookingParticipants).values([
      { bookingId: id, clientId, role: "host", status: "accepted" },
      { bookingId: id, clientId: guestId, role: "guest", status: "accepted" },
    ]);

    const roster = await listParticipantsForTherapist(id, therapistId);
    expect(roster).not.toBeNull();
    const host = roster!.find((p) => p.role === "host");
    const guest = roster!.find((p) => p.userId === guestId);
    expect(host?.email).toContain("@");
    expect(guest?.email).toContain("@");
    expect(guest?.status).toBe("accepted");
  });
});
