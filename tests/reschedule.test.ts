/**
 * Integration tests for booking reschedule against the live seeded database.
 * Creates a booking on one slot and moves it to another open slot of the same
 * therapist, asserting both slots and the booking timing update correctly.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, ne } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { registerAction } from "@/modules/identity/actions/register";
import { users } from "@/modules/identity/db/schema";
import { availabilitySlots } from "@/modules/therapists/db/schema";
import { bookings } from "@/modules/booking/db/schema";
import { createBooking } from "@/modules/booking/lib/create-booking";
import { rescheduleBooking } from "@/modules/booking/lib/reschedule-booking";

const VALID_PASSWORD = "correct-horse-battery-staple";

let clientId: string;
let slotAId: string;
let slotBId: string;
let bookingId: string;

beforeAll(async () => {
  const db = getDb();

  const email = `test-reschedule-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const reg = await registerAction({
    name: "Reschedule Test",
    email,
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
    consent: true,
  });
  if (!reg.ok) throw new Error(`register failed: ${reg.error}`);
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  clientId = row!.id;

  // Pick an open slot, then a SECOND open slot of the same therapist.
  const [slotA] = await db
    .select({ id: availabilitySlots.id, therapistId: availabilitySlots.therapistId })
    .from(availabilitySlots)
    .where(eq(availabilitySlots.isBooked, false))
    .limit(1);
  if (!slotA) throw new Error("No open slot in seed data.");
  slotAId = slotA.id;

  const [slotB] = await db
    .select({ id: availabilitySlots.id })
    .from(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.isBooked, false),
        eq(availabilitySlots.therapistId, slotA.therapistId),
        ne(availabilitySlots.id, slotA.id),
      ),
    )
    .limit(1);
  if (!slotB) throw new Error("Therapist needs a second open slot for this test.");
  slotBId = slotB.id;

  const created = await createBooking({ clientId, slotId: slotAId });
  if (!created.ok) throw new Error(`create failed: ${created.error}`);
  bookingId = created.bookingId;
});

afterAll(async () => {
  try {
    const db = getDb();
    if (bookingId) await db.delete(bookings).where(eq(bookings.id, bookingId));
    for (const id of [slotAId, slotBId]) {
      if (id) await db.update(availabilitySlots).set({ isBooked: false }).where(eq(availabilitySlots.id, id));
    }
    if (clientId) await db.delete(users).where(eq(users.id, clientId));
  } catch (err) {
    console.warn("[reschedule.test] cleanup failed:", err);
  }
});

describe("rescheduleBooking", () => {
  it("moves the booking to the new slot and frees the old one", async () => {
    const db = getDb();
    const [slotB] = await db
      .select({ startsAt: availabilitySlots.startsAt })
      .from(availabilitySlots)
      .where(eq(availabilitySlots.id, slotBId))
      .limit(1);

    const result = await rescheduleBooking({ bookingId, userId: clientId, newSlotId: slotBId });
    expect(result.ok).toBe(true);

    const [booking] = await db
      .select({ slotId: bookings.slotId, startsAt: bookings.startsAt })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    expect(booking?.slotId).toBe(slotBId);
    expect(booking?.startsAt.getTime()).toBe(slotB!.startsAt.getTime());

    const [a] = await db.select({ isBooked: availabilitySlots.isBooked }).from(availabilitySlots).where(eq(availabilitySlots.id, slotAId)).limit(1);
    const [b] = await db.select({ isBooked: availabilitySlots.isBooked }).from(availabilitySlots).where(eq(availabilitySlots.id, slotBId)).limit(1);
    expect(a?.isBooked).toBe(false);
    expect(b?.isBooked).toBe(true);
  });

  it("rejects a reschedule by a different user", async () => {
    const result = await rescheduleBooking({
      bookingId,
      userId: "someone-else",
      newSlotId: slotAId,
    });
    expect(result.ok).toBe(false);
  });
});
