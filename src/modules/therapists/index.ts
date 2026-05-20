// Public API for the `therapists` module. Other modules and route files must
// import from here only — never deep-import the module internals.

// --- Table refs + schema-derived enums/types ---------------------------------
export {
  therapists,
  availabilitySlots,
  therapistApplications,
  THERAPIST_STATUS,
  THERAPIST_GENDERS,
  THERAPIST_APPLICATION_STATUS,
} from "./db/schema";
export type {
  Therapist,
  NewTherapist,
  TherapistStatus,
  TherapistGender,
  AvailabilitySlot,
  NewAvailabilitySlot,
  TherapistApplication,
  NewTherapistApplication,
  TherapistApplicationStatus,
} from "./db/schema";

// --- Lib helpers -------------------------------------------------------------
export { slugify, uniqueSlug } from "./lib/slug";
export { therapistFilterSchema } from "./lib/filters";
export type { TherapistFilter } from "./lib/filters";

// --- Queries -----------------------------------------------------------------
export { getTherapistBySlug } from "./queries/get-therapist-by-slug";
export type { TherapistDetail } from "./queries/get-therapist-by-slug";

export { listPendingApplications } from "./queries/list-pending-applications";

export { listTherapistsAdmin } from "./queries/list-therapists-admin";
export type { TherapistAdminRow } from "./queries/list-therapists-admin";

// --- Server actions ----------------------------------------------------------
export { submitApplicationAction } from "./actions/submit-application";
export type {
  SubmitApplicationInput,
  SubmitApplicationResult,
} from "./actions/submit-application";

export { reviewApplicationAction } from "./actions/review-application";
export type {
  ReviewApplicationInput,
  ReviewApplicationResult,
} from "./actions/review-application";

export { setTherapistStatusAction } from "./actions/set-therapist-status";
export type {
  SetTherapistStatusInput,
  SetTherapistStatusResult,
} from "./actions/set-therapist-status";
