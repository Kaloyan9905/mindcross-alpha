/**
 * Integration tests for wellbeing check-ins against the live DB. A client logs
 * check-ins (one shared, one private); the therapist they've booked sees only
 * the shared one.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, isNotNull } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDb } from "@/lib/db";
import { registerAction } from "@/modules/identity/actions/register";
import { users } from "@/modules/identity/db/schema";
import { availabilitySlots, therapists } from "@/modules/therapists/db/schema";
import { bookings } from "@/modules/booking/db/schema";
import { createBooking } from "@/modules/booking/lib/create-booking";
import { createCheckin } from "@/modules/wellbeing/lib/create-checkin";
import { listCheckins } from "@/modules/wellbeing/queries/list-checkins";
import { listSharedCheckinsForTherapist } from "@/modules/wellbeing/queries/list-shared-for-therapist";

const PW = "correct-horse-battery-staple";
const TAG = Math.random().toString(36).slice(2, 8);

let clientId: string;
let therapistId: string;
let otherTherapistId: string | null = null;
let slotId: string;
let bookingId: string;

beforeAll(async () => {
  const db = getDb();
  const email = `wb-${Date.now()}-${TAG}@example.com`;
  const reg = await registerAction({
    name: `WB Test ${TAG}`,
    email,
    password: PW,
    confirmPassword: PW,
    consent: true,
  });
  if (!reg.ok) throw new Error(`register failed: ${reg.error}`);
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  clientId = row!.id;

  const activeTherapists = await db
    .select({ id: therapists.id })
    .from(therapists)
    .where(and(eq(therapists.status, "active"), isNotNull(therapists.userId)))
    .limit(2);
  therapistId = activeTherapists[0]!.id;
  otherTherapistId = activeTherapists[1]?.id ?? null;

  slotId = uuidv7();
  const start = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(availabilitySlots).values({
    id: slotId,
    therapistId,
    startsAt: start,
    endsAt: new Date(start.getTime() + 60 * 60 * 1000),
    isBooked: false,
  });
  const booked = await createBooking({ clientId, slotId });
  if (!booked.ok) throw new Error(`booking failed: ${booked.error}`);
  bookingId = booked.bookingId;
});

afterAll(async () => {
  try {
    const db = getDb();
    if (bookingId) await db.delete(bookings).where(eq(bookings.id, bookingId));
    if (slotId) await db.delete(availabilitySlots).where(eq(availabilitySlots.id, slotId));
    if (clientId) await db.delete(users).where(eq(users.id, clientId));
  } catch (err) {
    console.warn("[wellbeing.test] cleanup failed:", err);
  }
});

describe("wellbeing check-ins", () => {
  it("records and lists a client's check-ins", async () => {
    expect(
      (await createCheckin({ clientId, mood: 4, feelings: ["Hopeful"] })).ok,
    ).toBe(true);
    expect(
      (await createCheckin({ clientId, mood: 2, sharedWithTherapist: true, note: "rough week" })).ok,
    ).toBe(true);
    const list = await listCheckins(clientId);
    expect(list.length).toBe(2);
  });

  it("rejects an out-of-range mood", async () => {
    expect((await createCheckin({ clientId, mood: 9 })).ok).toBe(false);
  });

  it("shows the booked therapist only the SHARED check-in", async () => {
    const shared = await listSharedCheckinsForTherapist(therapistId);
    const mine = shared.filter((c) => c.clientId === clientId);
    expect(mine.length).toBe(1);
    expect(mine[0].mood).toBe(2);
  });

  it("hides check-ins from a therapist the client hasn't booked", async () => {
    if (!otherTherapistId) return;
    const shared = await listSharedCheckinsForTherapist(otherTherapistId);
    expect(shared.some((c) => c.clientId === clientId)).toBe(false);
  });
});
