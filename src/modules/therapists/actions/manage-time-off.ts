"use server";

import { z } from "zod";

import { getTherapistForCurrentUser } from "../queries/get-therapist-for-user";
import {
  addTimeOff,
  removeTimeOff,
  type TimeOffResult,
} from "../lib/manage-time-off";

export type { TimeOffResult } from "../lib/manage-time-off";

const addSchema = z.object({
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  note: z.string().trim().max(200).optional(),
});

export interface AddTimeOffInput {
  startsAt: string;
  endsAt: string;
  note?: string;
}

/** Therapist Server Action: block a span of time as unavailable. */
export async function addTimeOffAction(input: AddTimeOffInput): Promise<TimeOffResult> {
  const me = await getTherapistForCurrentUser();
  if (!me) return { ok: false, error: "You must be signed in as a therapist." };

  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid time off." };
  }
  return addTimeOff({
    therapistId: me.id,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt,
    note: parsed.data.note,
  });
}

const removeSchema = z.object({ id: z.string().min(1) });

/** Therapist Server Action: remove one of the signed-in therapist's time-off blocks. */
export async function removeTimeOffAction(input: { id: string }): Promise<TimeOffResult> {
  const me = await getTherapistForCurrentUser();
  if (!me) return { ok: false, error: "You must be signed in as a therapist." };

  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  return removeTimeOff({ therapistId: me.id, id: parsed.data.id });
}
