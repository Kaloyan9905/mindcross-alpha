"use server";

import { z } from "zod";
import { getCurrentUser } from "@/modules/identity";
import {
  rescheduleBooking,
  type RescheduleBookingResult,
} from "../lib/reschedule-booking";

export type { RescheduleBookingResult } from "../lib/reschedule-booking";

const actionSchema = z.object({
  bookingId: z.string().min(1, "A booking is required."),
  newSlotId: z.string().min(1, "A new slot is required."),
});

export type RescheduleBookingInput = z.infer<typeof actionSchema>;

/**
 * Server Action: reschedule the signed-in client's OWN booking to a new slot.
 * Resolves the session, then delegates to the trusted core (which re-checks
 * ownership).
 */
export async function rescheduleBookingAction(
  input: RescheduleBookingInput,
): Promise<RescheduleBookingResult> {
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to reschedule a booking." };
  }
  return rescheduleBooking({
    bookingId: parsed.data.bookingId,
    userId: user.id,
    newSlotId: parsed.data.newSlotId,
  });
}
