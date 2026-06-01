import { and, asc, eq, gt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  availabilitySlots,
  type AvailabilitySlot,
} from "@/modules/therapists/db/schema";

/**
 * A therapist's OPEN (unbooked) future slots, soonest first — used to populate
 * the booking + reschedule pickers.
 */
export async function listOpenSlotsForTherapist(
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
        eq(availabilitySlots.isBooked, false),
        gt(availabilitySlots.startsAt, now),
      ),
    )
    .orderBy(asc(availabilitySlots.startsAt));
}
