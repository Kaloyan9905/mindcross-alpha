import { and, asc, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  availabilitySlots,
  type AvailabilitySlot,
} from "@/modules/therapists/db/schema";

/**
 * A therapist's upcoming availability slots (booked + open), soonest first, so
 * they can manage their calendar. Past slots are omitted — they cannot be
 * booked and only add noise.
 */
export async function listUpcomingAvailability(
  therapistId: string,
  now: Date = new Date(),
): Promise<AvailabilitySlot[]> {
  const db = getDb();
  return db
    .select()
    .from(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.therapistId, therapistId),
        gte(availabilitySlots.startsAt, now),
      ),
    )
    .orderBy(asc(availabilitySlots.startsAt));
}
