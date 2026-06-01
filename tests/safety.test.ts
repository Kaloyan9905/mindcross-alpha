/**
 * Integration test for the safety plan (one row per client, upsert).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { registerAction } from "@/modules/identity/actions/register";
import { users } from "@/modules/identity/db/schema";
import { upsertSafetyPlan } from "@/modules/safety/lib/upsert-safety-plan";
import { getSafetyPlan } from "@/modules/safety/queries/get-safety-plan";

const PW = "correct-horse-battery-staple";
const TAG = Math.random().toString(36).slice(2, 8);
let clientId: string;

beforeAll(async () => {
  const db = getDb();
  const email = `safety-${Date.now()}-${TAG}@example.com`;
  const reg = await registerAction({
    name: `Safety ${TAG}`,
    email,
    password: PW,
    confirmPassword: PW,
    consent: true,
  });
  if (!reg.ok) throw new Error(`register failed: ${reg.error}`);
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  clientId = row!.id;
});

afterAll(async () => {
  try {
    const db = getDb();
    if (clientId) await db.delete(users).where(eq(users.id, clientId));
  } catch (err) {
    console.warn("[safety.test] cleanup failed:", err);
  }
});

describe("safety plan", () => {
  it("creates then updates a single plan", async () => {
    expect((await upsertSafetyPlan({ clientId, warningSigns: "a" })).ok).toBe(true);
    let plan = await getSafetyPlan(clientId);
    expect(plan?.warningSigns).toBe("a");
    expect(plan?.copingStrategies).toBeNull();

    expect(
      (await upsertSafetyPlan({ clientId, warningSigns: "b", copingStrategies: "c" }))
        .ok,
    ).toBe(true);
    plan = await getSafetyPlan(clientId);
    expect(plan?.warningSigns).toBe("b");
    expect(plan?.copingStrategies).toBe("c");
  });

  it("blank fields persist as null, not empty strings", async () => {
    await upsertSafetyPlan({ clientId, warningSigns: "x", supportPeople: "   " });
    const plan = await getSafetyPlan(clientId);
    expect(plan?.supportPeople).toBeNull();
  });
});
