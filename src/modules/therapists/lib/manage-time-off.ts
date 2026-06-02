import { and, eq, gt, lt } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { availabilitySlots, therapistTimeOff } from "../db/schema";

export type TimeOffResult = { ok: true } | { ok: false; error: string };

const MAX_DAYS = 60;

/**
 * Trusted core: block `[startsAt, endsAt)` as unavailable for `therapistId` and
 * clear any OPEN (unbooked) slots it overlaps (so clients can't book them).
 * Booked sessions inside the block are left for the therapist to cancel.
 * `therapistId` is already authenticated by the action.
 */
export async function addTimeOff(input: {
  therapistId: string;
  startsAt: Date;
  endsAt: Date;
  note?: string | null;
}): Promise<TimeOffResult> {
  const { therapistId, startsAt, endsAt } = input;
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { ok: false, error: "Invalid dates." };
  }
  if (endsAt <= startsAt) {
    return { ok: false, error: "The end must be after the start." };
  }
  if (endsAt.getTime() - startsAt.getTime() > MAX_DAYS * 86_400_000) {
    return { ok: false, error: `Block at most ${MAX_DAYS} days at a time.` };
  }
  const note = input.note && input.note.trim().length > 0 ? input.note.trim().slice(0, 200) : null;

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(therapistTimeOff).values({ therapistId, startsAt, endsAt, note });
      // Half-open overlap: slot.startsAt < endsAt AND slot.endsAt > startsAt.
      await tx
        .delete(availabilitySlots)
        .where(
          and(
            eq(availabilitySlots.therapistId, therapistId),
            eq(availabilitySlots.isBooked, false),
            lt(availabilitySlots.startsAt, endsAt),
            gt(availabilitySlots.endsAt, startsAt),
          ),
        );
    });
    return { ok: true };
  } catch (err) {
    console.error("addTimeOff failed:", err);
    return { ok: false, error: "Could not block the time. Please try again." };
  }
}

/** Trusted core: remove a time-off block owned by `therapistId`. */
export async function removeTimeOff(input: {
  therapistId: string;
  id: string;
}): Promise<TimeOffResult> {
  if (!input.id) return { ok: false, error: "Invalid request." };
  try {
    await getDb()
      .delete(therapistTimeOff)
      .where(
        and(
          eq(therapistTimeOff.id, input.id),
          eq(therapistTimeOff.therapistId, input.therapistId),
        ),
      );
    return { ok: true };
  } catch (err) {
    console.error("removeTimeOff failed:", err);
    return { ok: false, error: "Could not remove the time off. Please try again." };
  }
}
