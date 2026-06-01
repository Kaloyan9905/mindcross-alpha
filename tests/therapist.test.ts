/**
 * Integration tests for therapist-side booking logic: marking a session
 * outcome (completed / no-show) and the therapist bookings listing. Exercises
 * the trusted cores directly (the actions are thin session-resolving wrappers).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { registerAction } from "@/modules/identity/actions/register";
import { users } from "@/modules/identity/db/schema";
import { availabilitySlots } from "@/modules/therapists/db/schema";
import { bookings } from "@/modules/booking/db/schema";
import { createBooking } from "@/modules/booking/lib/create-booking";
import { setBookingOutcome } from "@/modules/booking/lib/set-booking-outcome";
import { listBookingsForTherapist } from "@/modules/booking/queries/list-bookings-for-therapist";

const VALID_PASSWORD = "correct-horse-battery-staple";

let clientId: string;
let therapistId: string;
let slotId: string;
let bookingId: string;

beforeAll(async () => {
  const db = getDb();

  const email = `test-therapist-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const reg = await registerAction({
    name: "Therapist Test Client",
    email,
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
    consent: true,
  });
  if (!reg.ok) throw new Error(`register failed: ${reg.error}`);
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  clientId = row!.id;

  const [slot] = await db
    .select({ id: availabilitySlots.id, therapistId: availabilitySlots.therapistId })
    .from(availabilitySlots)
    .where(eq(availabilitySlots.isBooked, false))
    .limit(1);
  if (!slot) throw new Error("No open slot in seed data.");
  slotId = slot.id;
  therapistId = slot.therapistId;

  const created = await createBooking({ clientId, slotId });
  if (!created.ok) throw new Error(`create failed: ${created.error}`);
  bookingId = created.bookingId;
});

afterAll(async () => {
  try {
    const db = getDb();
    if (bookingId) await db.delete(bookings).where(eq(bookings.id, bookingId));
    if (slotId) await db.update(availabilitySlots).set({ isBooked: false }).where(eq(availabilitySlots.id, slotId));
    if (clientId) await db.delete(users).where(eq(users.id, clientId));
  } catch (err) {
    console.warn("[therapist.test] cleanup failed:", err);
  }
});

describe("setBookingOutcome", () => {
  it("marks a session completed with notes (by the owning therapist)", async () => {
    const result = await setBookingOutcome({
      therapistId,
      bookingId,
      outcome: "completed",
      therapistNotes: "Good first session.",
    });
    expect(result.ok).toBe(true);

    const db = getDb();
    const [b] = await db
      .select({ status: bookings.status, therapistNotes: bookings.therapistNotes })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    expect(b?.status).toBe("completed");
    expect(b?.therapistNotes).toBe("Good first session.");
  });

  it("rejects a different therapist marking the booking", async () => {
    const result = await setBookingOutcome({
      therapistId: "not-the-owner",
      bookingId,
      outcome: "no_show",
    });
    expect(result.ok).toBe(false);
  });
});

describe("listBookingsForTherapist", () => {
  it("includes the booking with the client's identity", async () => {
    const rows = await listBookingsForTherapist(therapistId);
    const match = rows.find((r) => r.id === bookingId);
    expect(match).toBeDefined();
    expect(match?.clientEmail).toBeTypeOf("string");
  });
});
