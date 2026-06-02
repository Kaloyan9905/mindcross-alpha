import { and, asc, eq, gt, lt } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { therapistTimeOff, type TherapistTimeOff } from "@/modules/therapists/db/schema";

/**
 * A therapist's time-off blocks overlapping `[from, to)`, soonest first — for
 * the calendar. Overlap: starts before the window ends AND ends after it starts.
 */
export async function listTimeOff(
  therapistId: string,
  from: Date,
  to: Date,
): Promise<TherapistTimeOff[]> {
  const db = getDb();
  return db
    .select()
    .from(therapistTimeOff)
    .where(
      and(
        eq(therapistTimeOff.therapistId, therapistId),
        lt(therapistTimeOff.startsAt, to),
        gt(therapistTimeOff.endsAt, from),
      ),
    )
    .orderBy(asc(therapistTimeOff.startsAt));
}
