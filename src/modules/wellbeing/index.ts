/**
 * Public API for the wellbeing module — mood/feeling check-ins a client can
 * keep and optionally share with their therapist. Cores take a trusted id;
 * the action resolves the session. Tests import cores from source.
 */

export { createCheckinAction } from "./actions/create-checkin";

export { createCheckin } from "./lib/create-checkin";
export type {
  CreateCheckinInput,
  CreateCheckinResult,
} from "./lib/create-checkin";

export { listCheckins } from "./queries/list-checkins";
export type { CheckinRow } from "./queries/list-checkins";
export { listSharedCheckinsForTherapist } from "./queries/list-shared-for-therapist";
export type { SharedCheckinRow } from "./queries/list-shared-for-therapist";

export { wellbeingCheckins, MOOD_MIN, MOOD_MAX } from "./db/schema";
export type { WellbeingCheckin, NewWellbeingCheckin } from "./db/schema";
