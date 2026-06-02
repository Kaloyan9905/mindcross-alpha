import { and, eq, isNotNull, isNull, lt } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { bookings } from "../db/schema";
import { GRACE_MS, RETENTION_MS } from "./session-lifecycle";

export interface SessionMaintenanceResult {
  expired: number;
  purged: number;
}

/**
 * Mark as `no_show` every confirmed session whose start+grace has passed with
 * nobody joining (`started_at IS NULL`). The UI already derives this state live;
 * this persists it for records. Idempotent — re-running marks nothing new.
 */
export async function expireMissedSessions(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - GRACE_MS);
  const rows = await getDb()
    .update(bookings)
    .set({ status: "no_show", updatedAt: now })
    .where(
      and(
        eq(bookings.status, "confirmed"),
        isNull(bookings.startedAt),
        isNull(bookings.deletedAt),
        lt(bookings.startsAt, cutoff),
      ),
    )
    .returning({ id: bookings.id });
  return rows.length;
}

/**
 * Permanently delete soft-removed bookings past the retention window. The
 * schema's ON DELETE CASCADE removes the booking's participants and meeting
 * rows; the (long-past) slot is irrelevant by now.
 */
export async function purgeDeletedBookings(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - RETENTION_MS);
  const rows = await getDb()
    .delete(bookings)
    .where(and(isNotNull(bookings.deletedAt), lt(bookings.deletedAt, cutoff)))
    .returning({ id: bookings.id });
  return rows.length;
}

/** Run all session-maintenance scans (driven by the cron). Each is best-effort. */
export async function runSessionMaintenance(
  now: Date = new Date(),
): Promise<SessionMaintenanceResult> {
  let expired = 0;
  let purged = 0;
  try {
    expired = await expireMissedSessions(now);
  } catch (err) {
    console.error("[booking] expireMissedSessions failed:", err);
  }
  try {
    purged = await purgeDeletedBookings(now);
  } catch (err) {
    console.error("[booking] purgeDeletedBookings failed:", err);
  }
  return { expired, purged };
}
