"use server";

import { getCurrentUser } from "@/modules/identity";
import { upsertSafetyPlan } from "../lib/upsert-safety-plan";
import type { SafetyPlanResult } from "../lib/upsert-safety-plan";

/** Save the signed-in client's safety plan. */
export async function saveSafetyPlanAction(input: {
  warningSigns?: string;
  copingStrategies?: string;
  supportPeople?: string;
  professionalContacts?: string;
  safeEnvironment?: string;
  reasonsToLive?: string;
}): Promise<SafetyPlanResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return upsertSafetyPlan({ clientId: user.id, ...input });
}
