import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { wellbeingCheckins } from "../db/schema";

export interface CheckinRow {
  id: string;
  mood: number;
  feelings: string[];
  note: string | null;
  sharedWithTherapist: boolean;
  createdAt: Date;
}

/** A client's own check-ins, newest first. */
export async function listCheckins(
  clientId: string,
  limit = 60,
): Promise<CheckinRow[]> {
  const db = getDb();
  return db
    .select({
      id: wellbeingCheckins.id,
      mood: wellbeingCheckins.mood,
      feelings: wellbeingCheckins.feelings,
      note: wellbeingCheckins.note,
      sharedWithTherapist: wellbeingCheckins.sharedWithTherapist,
      createdAt: wellbeingCheckins.createdAt,
    })
    .from(wellbeingCheckins)
    .where(eq(wellbeingCheckins.clientId, clientId))
    .orderBy(desc(wellbeingCheckins.createdAt))
    .limit(limit);
}
