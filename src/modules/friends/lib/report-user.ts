import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { REPORT_REASON, userReports } from "../db/schema";
import type { FriendResult } from "./result";

const schema = z.object({
  reporterId: z.string().min(1),
  reportedId: z.string().min(1),
  reason: z.enum(REPORT_REASON),
  details: z.string().trim().max(2000).optional(),
  context: z.string().trim().max(200).optional(),
});
export type ReportUserInput = z.infer<typeof schema>;

/**
 * File an abuse report for staff triage. Any signed-in user may report another
 * existing user; the report row survives the reported account's deletion
 * (`reported_id` is ON DELETE SET NULL) so evidence is preserved.
 */
export async function reportUser(input: {
  reporterId: string;
  reportedId: string;
  reason: (typeof REPORT_REASON)[number];
  details?: string;
  context?: string;
}): Promise<FriendResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid report." };
  }
  const { reporterId, reportedId, reason, details, context } = parsed.data;

  if (reporterId === reportedId) {
    return { ok: false, error: "You can't report yourself." };
  }

  const db = getDb();
  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, reportedId))
    .limit(1);
  if (!target) return { ok: false, error: "We couldn't find that person." };

  await db.insert(userReports).values({
    reporterId,
    reportedId,
    reason,
    details: details && details.length > 0 ? details : null,
    context: context && context.length > 0 ? context : null,
  });
  return { ok: true };
}
