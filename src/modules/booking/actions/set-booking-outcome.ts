"use server";

import { z } from "zod";
import { getTherapistForCurrentUser } from "@/modules/therapists";
import {
  setBookingOutcome,
  type SetBookingOutcomeResult,
} from "../lib/set-booking-outcome";

export type { SetBookingOutcomeResult } from "../lib/set-booking-outcome";

const actionSchema = z.object({
  bookingId: z.string().min(1, "A booking is required."),
  outcome: z.enum(["completed", "no_show"]),
  therapistNotes: z.string().trim().max(2000).optional(),
});

export type SetBookingOutcomeInput = z.infer<typeof actionSchema>;

/**
 * Therapist Server Action: mark one of the signed-in therapist's OWN sessions
 * as completed / no-show. Resolves the therapist from the session, then
 * delegates to the trusted core (which re-checks ownership).
 */
export async function setBookingOutcomeAction(
  input: SetBookingOutcomeInput,
): Promise<SetBookingOutcomeResult> {
  const me = await getTherapistForCurrentUser();
  if (!me) {
    return { ok: false, error: "You must be signed in as a therapist." };
  }
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  return setBookingOutcome({ therapistId: me.id, ...parsed.data });
}
