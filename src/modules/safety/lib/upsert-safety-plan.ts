import { z } from "zod";
import { getDb } from "@/lib/db";
import { safetyPlans } from "../db/schema";

export type SafetyPlanResult = { ok: true } | { ok: false; error: string };

const field = z.string().trim().max(4000).optional();

const schema = z.object({
  clientId: z.string().min(1),
  warningSigns: field,
  copingStrategies: field,
  supportPeople: field,
  professionalContacts: field,
  safeEnvironment: field,
  reasonsToLive: field,
});
export type UpsertSafetyPlanInput = z.infer<typeof schema>;

/** Empty string → null, so blank fields don't persist as "". */
function clean(v: string | undefined): string | null {
  return v && v.length > 0 ? v : null;
}

/**
 * Create or update the signed-in client's single safety plan (one row per
 * client, enforced by the unique index). `clientId` is trusted (resolved by the
 * action).
 */
export async function upsertSafetyPlan(input: {
  clientId: string;
  warningSigns?: string;
  copingStrategies?: string;
  supportPeople?: string;
  professionalContacts?: string;
  safeEnvironment?: string;
  reasonsToLive?: string;
}): Promise<SafetyPlanResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid plan." };
  }
  const { clientId, ...rest } = parsed.data;
  const fields = {
    warningSigns: clean(rest.warningSigns),
    copingStrategies: clean(rest.copingStrategies),
    supportPeople: clean(rest.supportPeople),
    professionalContacts: clean(rest.professionalContacts),
    safeEnvironment: clean(rest.safeEnvironment),
    reasonsToLive: clean(rest.reasonsToLive),
  };

  const db = getDb();
  await db
    .insert(safetyPlans)
    .values({ clientId, ...fields })
    .onConflictDoUpdate({
      target: safetyPlans.clientId,
      set: { ...fields, updatedAt: new Date() },
    });
  return { ok: true };
}
