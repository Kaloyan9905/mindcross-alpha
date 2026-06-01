"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
// Deep-import the schema (not the friends barrel) to avoid an import cycle —
// the same convention delete-user.ts uses. Schema files have no server deps.
import { REPORT_STATUS, userReports } from "@/modules/friends/db/schema";
import { getAdminUser } from "../lib/policies";

export type ReviewReportResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  reportId: z.string().min(1),
  status: z.enum(REPORT_STATUS),
});
export type ReviewReportInput = z.infer<typeof schema>;

/**
 * Update the triage status of an abuse report. Staff-only (self-authorizing via
 * `getAdminUser`); records who reviewed it and when.
 */
export async function reviewReportAction(
  input: ReviewReportInput,
): Promise<ReviewReportResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "You are not authorized." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { reportId, status } = parsed.data;

  const db = getDb();
  await db
    .update(userReports)
    .set({ status, reviewedBy: admin.id, reviewedAt: new Date() })
    .where(eq(userReports.id, reportId));
  return { ok: true };
}
