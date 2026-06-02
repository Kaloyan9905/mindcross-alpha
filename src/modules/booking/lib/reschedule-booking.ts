import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { sessionRoomUrl } from "@/lib/site";
import { users } from "@/modules/identity/db/schema";
import { availabilitySlots, therapists } from "@/modules/therapists/db/schema";
import { bookingRescheduled, sendEmail } from "@/modules/notifications";
import { bookings } from "../db/schema";

/** A session can't be rescheduled within this window of its start. */
const ONE_HOUR_MS = 60 * 60 * 1000;

export type RescheduleBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string };

/**
 * Core: `userId` is the AUTHENTICATED client's id — trusted, server-only. The
 * public entry is `rescheduleBookingAction`, which resolves the session.
 */
const rescheduleSchema = z.object({
  bookingId: z.string().min(1, "A booking is required."),
  userId: z.string().min(1, "A user is required."),
  newSlotId: z.string().min(1, "A new slot is required."),
});

export type RescheduleBookingInput = z.infer<typeof rescheduleSchema>;

/**
 * Move a confirmed booking to a different OPEN slot of the SAME therapist.
 *
 * Transactional with row locks on both the booking and the new slot: frees the
 * old slot, books the new one, and re-points the booking's timing. The 24h/1h
 * reminder flags are reset to NULL so the reminders re-evaluate against the new
 * time. The "rescheduled" email is sent after commit and never fails the move.
 */
export async function rescheduleBooking(
  input: RescheduleBookingInput,
): Promise<RescheduleBookingResult> {
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  const { bookingId, userId, newSlotId } = parsed.data;

  const db = getDb();
  const now = new Date();

  let outcome: RescheduleBookingResult;
  try {
    outcome = await db.transaction(async (tx) => {
      const [booking] = await tx
        .select({
          id: bookings.id,
          clientId: bookings.clientId,
          therapistId: bookings.therapistId,
          slotId: bookings.slotId,
          status: bookings.status,
          startsAt: bookings.startsAt,
        })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .for("update")
        .limit(1);

      if (!booking) return { ok: false, error: "Booking not found." } as const;
      if (booking.clientId !== userId) {
        return { ok: false, error: "You are not allowed to reschedule this booking." } as const;
      }
      if (booking.status !== "confirmed") {
        return { ok: false, error: "Only a confirmed booking can be rescheduled." } as const;
      }
      if (booking.startsAt.getTime() - now.getTime() < ONE_HOUR_MS) {
        return {
          ok: false,
          error:
            "Sessions can't be rescheduled within an hour of the start time. Please contact support if you need to.",
        } as const;
      }

      const [slot] = await tx
        .select({
          id: availabilitySlots.id,
          therapistId: availabilitySlots.therapistId,
          startsAt: availabilitySlots.startsAt,
          endsAt: availabilitySlots.endsAt,
          isBooked: availabilitySlots.isBooked,
        })
        .from(availabilitySlots)
        .where(eq(availabilitySlots.id, newSlotId))
        .for("update")
        .limit(1);

      if (!slot || slot.isBooked) {
        return { ok: false, error: "That time is no longer available." } as const;
      }
      if (slot.id === booking.slotId) {
        return { ok: false, error: "That is already your booked time." } as const;
      }
      if (slot.therapistId !== booking.therapistId) {
        return { ok: false, error: "Choose a time with the same therapist." } as const;
      }
      if (slot.startsAt.getTime() <= now.getTime()) {
        return { ok: false, error: "Choose a time in the future." } as const;
      }

      // Free the old slot, claim the new one.
      if (booking.slotId) {
        await tx
          .update(availabilitySlots)
          .set({ isBooked: false })
          .where(eq(availabilitySlots.id, booking.slotId));
      }
      await tx
        .update(availabilitySlots)
        .set({ isBooked: true })
        .where(eq(availabilitySlots.id, slot.id));

      // Re-point timing + reset reminder flags so reminders re-evaluate.
      await tx
        .update(bookings)
        .set({
          slotId: slot.id,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          reminderSentAt: null,
          reminder1hSentAt: null,
          updatedAt: now,
        })
        .where(eq(bookings.id, booking.id));

      return { ok: true, bookingId: booking.id } as const;
    });
  } catch (err) {
    console.error("[booking] rescheduleBooking transaction failed:", err);
    return { ok: false, error: "We could not reschedule your booking. Please try again." };
  }

  if (!outcome.ok) return outcome;

  // Post-commit notification — failure must NOT fail the reschedule.
  try {
    const [details] = await db
      .select({
        clientName: users.name,
        clientEmail: users.email,
        therapistName: therapists.displayName,
        startsAt: bookings.startsAt,
        joinUrl: bookings.joinUrl,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.clientId, users.id))
      .innerJoin(therapists, eq(bookings.therapistId, therapists.id))
      .where(eq(bookings.id, outcome.bookingId))
      .limit(1);

    if (details) {
      const email = bookingRescheduled({
        clientName: details.clientName ?? "",
        therapistName: details.therapistName,
        startsAt: details.startsAt,
        joinUrl: sessionRoomUrl(outcome.bookingId),
      });
      await sendEmail({ to: details.clientEmail, ...email });
    }
  } catch (err) {
    console.error("[booking] reschedule email failed (booking still moved):", err);
  }

  return { ok: true, bookingId: outcome.bookingId };
}
