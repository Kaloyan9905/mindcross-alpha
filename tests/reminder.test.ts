/**
 * Integration tests for the 24h reminder scan (MVP feature #5) against the
 * live seeded database. They create a real booking and mutate its timing /
 * status to exercise the "due" logic, then assert on the booking's
 * `reminderSentAt` (never on global counts — other test files share this DB).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { registerAction } from "@/modules/identity/actions/register";
import { users } from "@/modules/identity/db/schema";
import { availabilitySlots } from "@/modules/therapists/db/schema";
import { bookings } from "@/modules/booking/db/schema";
import { createBooking } from "@/modules/booking/lib/create-booking";
import { sendDueReminders } from "@/modules/booking/lib/send-due-reminders";

const VALID_PASSWORD = "correct-horse-battery-staple";

let clientId: string;
let clientEmail: string;
let slotId: string;
let bookingId: string;

/** Read just the reminder timestamp for our booking. */
async function reminderSentAt(): Promise<Date | null> {
  const db = getDb();
  const [row] = await db
    .select({ reminderSentAt: bookings.reminderSentAt })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  return row?.reminderSentAt ?? null;
}

/** Read the 1h reminder timestamp for our booking. */
async function reminder1hSentAt(): Promise<Date | null> {
  const db = getDb();
  const [row] = await db
    .select({ reminder1hSentAt: bookings.reminder1hSentAt })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  return row?.reminder1hSentAt ?? null;
}

/** Force our booking into a known (startsAt, status, reminder) state. */
async function setBookingState(opts: {
  startsAt: Date;
  status?: "confirmed" | "cancelled";
  reminderSentAt?: Date | null;
  reminder1hSentAt?: Date | null;
}) {
  const db = getDb();
  await db
    .update(bookings)
    .set({
      startsAt: opts.startsAt,
      status: opts.status ?? "confirmed",
      reminderSentAt: opts.reminderSentAt ?? null,
      reminder1hSentAt: opts.reminder1hSentAt ?? null,
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId));
}

beforeAll(async () => {
  const db = getDb();

  clientEmail = `test-reminder-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@example.com`;
  const registration = await registerAction({
    name: "Reminder Test Client",
    email: clientEmail,
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
    consent: true,
  });
  if (!registration.ok) {
    throw new Error(`Failed to register test client: ${registration.error}`);
  }

  const [clientRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, clientEmail))
    .limit(1);
  if (!clientRow) throw new Error("Test client row not found after register.");
  clientId = clientRow.id;

  const [slot] = await db
    .select({ id: availabilitySlots.id })
    .from(availabilitySlots)
    .where(eq(availabilitySlots.isBooked, false))
    .limit(1);
  if (!slot) throw new Error("No unbooked availability slot in the seed data.");
  slotId = slot.id;

  const result = await createBooking({ clientId, slotId });
  if (!result.ok) throw new Error(`Failed to create test booking: ${result.error}`);
  bookingId = result.bookingId;
});

afterAll(async () => {
  try {
    const db = getDb();
    if (bookingId) await db.delete(bookings).where(eq(bookings.id, bookingId));
    if (slotId) {
      await db
        .update(availabilitySlots)
        .set({ isBooked: false })
        .where(eq(availabilitySlots.id, slotId));
    }
    if (clientId) await db.delete(users).where(eq(users.id, clientId));
  } catch (err) {
    console.warn("[reminder.test] cleanup failed:", err);
  }
});

describe("sendDueReminders", () => {
  it("sends a reminder for a confirmed booking starting within 24h", async () => {
    // 2 hours from now — inside the 24h window.
    await setBookingState({
      startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      reminderSentAt: null,
    });

    expect(await reminderSentAt()).toBeNull();
    await sendDueReminders();
    expect(await reminderSentAt()).not.toBeNull();
  });

  it("is idempotent — a second scan does not re-send (reminder timestamp unchanged)", async () => {
    // Booking is still in-window and already marked from the previous test.
    const before = await reminderSentAt();
    expect(before).not.toBeNull();

    await sendDueReminders();

    const after = await reminderSentAt();
    expect(after?.getTime()).toBe(before?.getTime());
  });

  it("does NOT remind a booking that is more than 24h away", async () => {
    // 48 hours out, reminder cleared.
    await setBookingState({
      startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      reminderSentAt: null,
    });

    await sendDueReminders();
    expect(await reminderSentAt()).toBeNull();
  });

  it("does NOT remind a cancelled booking even if it is within 24h", async () => {
    await setBookingState({
      startsAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      status: "cancelled",
      reminderSentAt: null,
    });

    await sendDueReminders();
    expect(await reminderSentAt()).toBeNull();
  });

  it("sends the 1h reminder (not the 24h one) for a session ~30 min away", async () => {
    // 30 minutes out: inside the 1h window (now, now+1h], outside the 24h
    // window (now+1h, now+24h].
    await setBookingState({
      startsAt: new Date(Date.now() + 30 * 60 * 1000),
      reminderSentAt: null,
      reminder1hSentAt: null,
    });

    await sendDueReminders();

    expect(await reminder1hSentAt()).not.toBeNull(); // 1h reminder fired
    expect(await reminderSentAt()).toBeNull(); // 24h reminder did not
  });
});
