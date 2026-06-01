"use server";

import { getCurrentUser } from "@/modules/identity";
import { reportUser } from "../lib/report-user";
import type { ReportReason } from "../db/schema";
import type { FriendResult } from "../lib/result";

/** File an abuse report against another user (reporter = session user). */
export async function reportUserAction(input: {
  reportedId: string;
  reason: ReportReason;
  details?: string;
  context?: string;
}): Promise<FriendResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return reportUser({
    reporterId: user.id,
    reportedId: input.reportedId,
    reason: input.reason,
    details: input.details,
    context: input.context,
  });
}
