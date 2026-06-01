import { desc } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import {
  userReports,
  type ReportReason,
  type ReportStatus,
} from "../db/schema";

export interface ReportListRow {
  id: string;
  reporterName: string | null;
  reportedName: string | null;
  reportedId: string | null;
  reason: ReportReason;
  details: string | null;
  context: string | null;
  status: ReportStatus;
  createdAt: Date;
}

/**
 * All abuse reports, newest first, with reporter/reported names resolved. For
 * the admin safety queue — gated by `requireAdmin()` in the page.
 */
export async function listReports(): Promise<ReportListRow[]> {
  const db = getDb();
  const reporter = alias(users, "reporter");
  const reported = alias(users, "reported");
  return db
    .select({
      id: userReports.id,
      reporterName: reporter.name,
      reportedName: reported.name,
      reportedId: userReports.reportedId,
      reason: userReports.reason,
      details: userReports.details,
      context: userReports.context,
      status: userReports.status,
      createdAt: userReports.createdAt,
    })
    .from(userReports)
    .leftJoin(reporter, eq(userReports.reporterId, reporter.id))
    .leftJoin(reported, eq(userReports.reportedId, reported.id))
    .orderBy(desc(userReports.createdAt))
    .limit(200);
}
