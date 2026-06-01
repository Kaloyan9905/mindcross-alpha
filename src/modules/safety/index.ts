/**
 * Public API for the safety module — a personal safety plan (one per client)
 * and a curated set of crisis helplines by region. Duty-of-care features for a
 * vulnerable audience.
 */

export { saveSafetyPlanAction } from "./actions/save-safety-plan";

export { upsertSafetyPlan } from "./lib/upsert-safety-plan";
export type {
  UpsertSafetyPlanInput,
  SafetyPlanResult,
} from "./lib/upsert-safety-plan";

export { getSafetyPlan } from "./queries/get-safety-plan";

export {
  CRISIS_REGIONS,
  UNIVERSAL_LINES,
  regionByCode,
} from "./lib/crisis-lines";
export type { CrisisLine, CrisisRegion } from "./lib/crisis-lines";

export { safetyPlans } from "./db/schema";
export type { SafetyPlan, NewSafetyPlan } from "./db/schema";
