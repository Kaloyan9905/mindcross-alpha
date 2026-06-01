"use server";

import { z } from "zod";
import { getCurrentUser } from "@/modules/identity";
import {
  createBooking,
  type CreateBookingResult,
} from "../lib/create-booking";

export type { CreateBookingResult } from "../lib/create-booking";

/**
 * Public booking input — note there is NO `clientId`. The client identity is
 * resolved from the authenticated session inside the action, never trusted
 * from the request body. This closes the IDOR where a caller could book on
 * behalf of another user by passing an arbitrary id.
 */
const createBookingActionSchema = z.object({
  slotId: z.string().min(1, "A slot is required."),
  clientNotes: z.string().trim().max(2000).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingActionSchema>;

/**
 * Server Action: book the slot `slotId` for the CURRENTLY SIGNED-IN client.
 *
 * Resolves the session, then delegates to the trusted `createBooking` core
 * with the session user's id as `clientId`.
 */
export async function createBookingAction(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const parsed = createBookingActionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid booking request." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to book a session." };
  }

  return createBooking({
    clientId: user.id,
    slotId: parsed.data.slotId,
    clientNotes: parsed.data.clientNotes,
  });
}
