"use server";

import { z } from "zod";
import { getCurrentUser } from "@/modules/identity";
import {
  cancelBooking,
  type CancelBookingResult,
} from "../lib/cancel-booking";

export type { CancelBookingResult } from "../lib/cancel-booking";

/**
 * Public cancel input — note there is NO `userId`. The identity is resolved
 * from the authenticated session inside the action, never trusted from the
 * request body. This closes the IDOR where a caller could cancel another
 * user's booking by passing their id.
 */
const cancelBookingActionSchema = z.object({
  bookingId: z.string().min(1, "A booking is required."),
});

export type CancelBookingInput = z.infer<typeof cancelBookingActionSchema>;

/**
 * Server Action: cancel a booking owned by the CURRENTLY SIGNED-IN user.
 *
 * Resolves the session, then delegates to the trusted `cancelBooking` core
 * (which still enforces that the booking belongs to that user).
 */
export async function cancelBookingAction(
  input: CancelBookingInput,
): Promise<CancelBookingResult> {
  const parsed = cancelBookingActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid cancellation request.",
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to cancel a booking." };
  }

  return cancelBooking({ bookingId: parsed.data.bookingId, userId: user.id });
}
