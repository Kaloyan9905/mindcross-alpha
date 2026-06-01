import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { safetyPlans, type SafetyPlan } from "../db/schema";

/** The signed-in client's safety plan, or null if they haven't made one. */
export async function getSafetyPlan(
  clientId: string,
): Promise<SafetyPlan | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(safetyPlans)
    .where(eq(safetyPlans.clientId, clientId))
    .limit(1);
  return row ?? null;
}
