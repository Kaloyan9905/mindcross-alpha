/**
 * Integration tests for the booking lifecycle against the live seeded
 * database. These MUTATE: they create a test client + booking and flip a real
 * availability slot's `isBooked` flag. Everything is cleaned up in afterAll.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
// Import from module SOURCE files, not the barrels. The `@/modules/identity`
// barrel re-exports Auth.js `auth`, and the `@/modules/booking` /
// `@/modules/therapists` barrels now re-export session-bound actions that
// transitively import `next-auth` -> `next/server` in a form Vitest's resolver
// cannot load. These are the SAME real functions/tables — no mocking. We test
// the trusted `createBooking` / `cancelBooking` cores directly (the actions are
// thin session-resolving wrappers over them).
import { registerAction } from "@/modules/identity/actions/register";
import { users } from "@/modules/identity/db/schema";
import { availabilitySlots } from "@/modules/therapists/db/schema";
import { bookings } from "@/modules/booking/db/schema";
import { createBooking } from "@/modules/booking/lib/create-booking";
import { cancelBooking } from "@/modules/booking/lib/cancel-booking";
import { listBookingsForClient } from "@/modules/booking/queries/list-bookings-for-client";

const VALID_PASSWORD = "correct-horse-battery-staple";

let clientId: string;
let clientEmail: string;
let slotId: string;
let bookingId: string;

beforeAll(async () => {
  const db = getDb();

  // Register a fresh test client through the real action.
  clientEmail = `test-booking-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@example.com`;
  const registration = await registerAction({
    name: "Booking Test Client",
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

  // Pick a real, unbooked seeded availability slot.
  const [slot] = await db
    .select({ id: availabilitySlots.id })
    .from(availabilitySlots)
    .where(eq(availabilitySlots.isBooked, false))
    .limit(1);
  if (!slot) throw new Error("No unbooked availability slot in the seed data.");
  slotId = slot.id;
});

afterAll(async () => {
  // Best-effort cleanup — never fail the suite over a cleanup hiccup.
  try {
    const db = getDb();
    if (bookingId) {
      await db.delete(bookings).where(eq(bookings.id, bookingId));
    }
    if (slotId) {
      // Restore the seed's slot state.
      await db
        .update(availabilitySlots)
        .set({ isBooked: false })
        .where(eq(availabilitySlots.id, slotId));
    }
    if (clientId) {
      await db.delete(users).where(eq(users.id, clientId));
    }
  } catch (err) {
    console.warn("[booking.test] cleanup failed:", err);
  }
});

describe("createBooking (core)", () => {
  it("creates a confirmed booking and flips the slot's isBooked flag", async () => {
    const result = await createBooking({ clientId, slotId });

    expect(result.ok).toBe(true);
    if (!result.ok) return; // narrow for TS
    expect(result.bookingId).toBeTypeOf("string");
    bookingId = result.bookingId;

    const db = getDb();
    const [bookingRow] = await db
      .select({ id: bookings.id, status: bookings.status })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    expect(bookingRow).toBeDefined();
    expect(bookingRow?.status).toBe("confirmed");

    const [slotRow] = await db
      .select({ isBooked: availabilitySlots.isBooked })
      .from(availabilitySlots)
      .where(eq(availabilitySlots.id, slotId))
      .limit(1);
    expect(slotRow?.isBooked).toBe(true);
  });

  it("prevents double-booking the same slot", async () => {
    const result = await createBooking({ clientId, slotId });
    expect(result.ok).toBe(false);
  });
});

describe("listBookingsForClient", () => {
  it("includes the newly created booking", async () => {
    const rows = await listBookingsForClient(clientId);
    expect(Array.isArray(rows)).toBe(true);
    const ids = rows.map((row) => row.id);
    expect(ids).toContain(bookingId);
  });
});

describe("cancelBooking (core)", () => {
  it("cancels the booking and frees the slot", async () => {
    const result = await cancelBooking({ bookingId, userId: clientId });
    expect(result.ok).toBe(true);

    const db = getDb();
    const [bookingRow] = await db
      .select({ status: bookings.status })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    expect(bookingRow?.status).toBe("cancelled");

    const [slotRow] = await db
      .select({ isBooked: availabilitySlots.isBooked })
      .from(availabilitySlots)
      .where(eq(availabilitySlots.id, slotId))
      .limit(1);
    expect(slotRow?.isBooked).toBe(false);
  });

  it("is idempotent — cancelling an already-cancelled booking still returns ok", async () => {
    const result = await cancelBooking({ bookingId, userId: clientId });
    expect(result.ok).toBe(true);
  });

  it("rejects a slot that was just freed being left un-rebookable", async () => {
    // Sanity: after cancellation the slot can be booked again.
    const result = await createBooking({ clientId, slotId });
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Re-point bookingId so afterAll cleans up this newer row, and free the
      // slot back for the seed.
      const db = getDb();
      await db.delete(bookings).where(eq(bookings.id, bookingId));
      bookingId = result.bookingId;
    }
  });
});

describe("createBooking input validation", () => {
  it("rejects an empty clientId", async () => {
    const result = await createBooking({ clientId: "", slotId });
    expect(result.ok).toBe(false);
  });

  it("returns ok:false for a nonexistent slot", async () => {
    const result = await createBooking({
      clientId,
      slotId: "nonexistent-slot-id-0000",
    });
    expect(result.ok).toBe(false);
  });
});
