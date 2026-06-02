"use server";

import { getCurrentUser } from "@/modules/identity";
import {
  removeBooking,
  restoreBooking,
  type RecycleResult,
} from "../lib/recycle-booking";

export type { RecycleResult } from "../lib/recycle-booking";

/**
 * Server Action: move a session to the recycle bin (soft-delete). Identity is
 * resolved from the session; the core authorizes the booking's client or
 * therapist.
 */
export async function removeBookingAction(input: {
  bookingId: string;
}): Promise<RecycleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return removeBooking({ bookingId: input.bookingId, userId: user.id });
}

/** Server Action: restore a session from the recycle bin. */
export async function restoreBookingAction(input: {
  bookingId: string;
}): Promise<RecycleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return restoreBooking({ bookingId: input.bookingId, userId: user.id });
}
