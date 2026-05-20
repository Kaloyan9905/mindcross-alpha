"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { availabilitySlots, therapists } from "@/modules/therapists/db/schema";
import { bookingCancellation, sendEmail } from "@/modules/notifications";
import { bookings } from "../db/schema";

/**
 * Result of a cancel-booking attempt. Discriminated on `ok` — expected
 * failures (not found, not authorized) are returned, never thrown.
 */
export type CancelBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string };

const cancelBookingSchema = z.object({
  bookingId: z.string().min(1, "A booking is required."),
  userId: z.string().min(1, "A user is required."),
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

/**
 * Cancel a booking.
 *
 * Authorization at MVP: only the client who owns the booking may cancel it.
 * (Staff cancellation is a post-MVP addition — the `cancelledBy` column is
 * already in place for it.)
 *
 * Idempotent: cancelling an already-cancelled booking returns `ok` without a
 * second write or a second email.
 *
 * The status flip and the slot `isBooked = false` reset happen in one
 * transaction so the slot is reliably freed for re-booking.
 */
export async function cancelBookingAction(
  input: CancelBookingInput,
): Promise<CancelBookingResult> {
  const parsed = cancelBookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid cancellation request.",
    };
  }
  const { bookingId, userId } = parsed.data;

  const db = getDb();
  const now = new Date();

  // Load the booking and authorize.
  const [booking] = await db
    .select({
      id: bookings.id,
      clientId: bookings.clientId,
      slotId: bookings.slotId,
      status: bookings.status,
    })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }

  // MVP: only the owning client may cancel.
  if (booking.clientId !== userId) {
    return { ok: false, error: "You are not allowed to cancel this booking." };
  }

  // Idempotent — already cancelled is a success, no further side effects.
  if (booking.status === "cancelled") {
    return { ok: true, bookingId: booking.id };
  }

  // Transactional write: cancel the booking and free its slot.
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          status: "cancelled",
          cancelledAt: now,
          cancelledBy: userId,
          updatedAt: now,
        })
        .where(eq(bookings.id, booking.id));

      if (booking.slotId) {
        await tx
          .update(availabilitySlots)
          .set({ isBooked: false })
          .where(eq(availabilitySlots.id, booking.slotId));
      }
    });
  } catch (err) {
    console.error("[booking] cancelBookingAction transaction failed:", err);
    return { ok: false, error: "We could not cancel your booking. Please try again." };
  }

  // Post-commit notification — failure must NOT fail the cancellation.
  try {
    const [details] = await db
      .select({
        clientName: users.name,
        clientEmail: users.email,
        therapistName: therapists.displayName,
        startsAt: bookings.startsAt,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.clientId, users.id))
      .innerJoin(therapists, eq(bookings.therapistId, therapists.id))
      .where(eq(bookings.id, booking.id))
      .limit(1);

    if (details) {
      const email = bookingCancellation({
        clientName: details.clientName ?? "",
        therapistName: details.therapistName,
        startsAt: details.startsAt,
      });
      await sendEmail({ to: details.clientEmail, ...email });
    }
  } catch (err) {
    console.error("[booking] cancellation email failed (booking still cancelled):", err);
  }

  return { ok: true, bookingId: booking.id };
}
