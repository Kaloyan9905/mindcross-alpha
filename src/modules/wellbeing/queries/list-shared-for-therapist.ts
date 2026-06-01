import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { bookings } from "@/modules/booking/db/schema";
import { wellbeingCheckins } from "../db/schema";

export interface SharedCheckinRow {
  id: string;
  clientId: string;
  clientName: string | null;
  mood: number;
  feelings: string[];
  note: string | null;
  createdAt: Date;
}

/**
 * Shared check-ins visible to a therapist — only from clients who have a
 * confirmed/completed booking with them, and only check-ins the client chose to
 * share. Newest first.
 */
export async function listSharedCheckinsForTherapist(
  therapistId: string,
  limit = 40,
): Promise<SharedCheckinRow[]> {
  const db = getDb();

  const clientRows = await db
    .selectDistinct({ clientId: bookings.clientId })
    .from(bookings)
    .where(
      and(
        eq(bookings.therapistId, therapistId),
        inArray(bookings.status, ["confirmed", "completed"]),
      ),
    );
  const clientIds = clientRows.map((r) => r.clientId);
  if (clientIds.length === 0) return [];

  return db
    .select({
      id: wellbeingCheckins.id,
      clientId: wellbeingCheckins.clientId,
      clientName: users.name,
      mood: wellbeingCheckins.mood,
      feelings: wellbeingCheckins.feelings,
      note: wellbeingCheckins.note,
      createdAt: wellbeingCheckins.createdAt,
    })
    .from(wellbeingCheckins)
    .innerJoin(users, eq(wellbeingCheckins.clientId, users.id))
    .where(
      and(
        eq(wellbeingCheckins.sharedWithTherapist, true),
        inArray(wellbeingCheckins.clientId, clientIds),
      ),
    )
    .orderBy(desc(wellbeingCheckins.createdAt))
    .limit(limit);
}
