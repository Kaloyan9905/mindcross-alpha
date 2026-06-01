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

export { listActiveTherapistSlugs } from "./queries/list-active-slugs";
export type { TherapistSlugRow } from "./queries/list-active-slugs";

export { listPendingApplications } from "./queries/list-pending-applications";

export { listTherapistsAdmin } from "./queries/list-therapists-admin";
export type { TherapistAdminRow } from "./queries/list-therapists-admin";

export { getTherapistForCurrentUser } from "./queries/get-therapist-for-user";
export { listUpcomingAvailability } from "./queries/list-availability-for-therapist";
export { listOpenSlotsForTherapist } from "./queries/list-open-slots";

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

export { setTherapistVerifiedAction } from "./actions/set-therapist-verified";
export type {
  SetTherapistVerifiedInput,
  SetTherapistVerifiedResult,
} from "./actions/set-therapist-verified";

// Therapist self-service (self-authorizing — scoped to the caller's profile).
export { updateTherapistProfileAction } from "./actions/update-profile";
export type {
  UpdateTherapistProfileInput,
  UpdateTherapistProfileResult,
} from "./actions/update-profile";

export {
  addAvailabilitySlotAction,
  removeAvailabilitySlotAction,
} from "./actions/manage-availability";
export type {
  AddAvailabilitySlotInput,
  RemoveAvailabilitySlotInput,
  AvailabilityResult,
} from "./actions/manage-availability";
