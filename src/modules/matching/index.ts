// Public API for the `matching` module. Filters-only search over `active`
// therapists — there is no scoring / ranking at MVP.

export { findTherapists } from "./queries/find-therapists";
export type {
  TherapistSummary,
  FindTherapistsResult,
} from "./queries/find-therapists";

export { getFilterOptions } from "./queries/filter-options";
export type { FilterOptions } from "./queries/filter-options";

// Re-export the filter schema/type so the public find-therapist page can
// validate its search params without reaching into the therapists module.
export { therapistFilterSchema } from "@/modules/therapists/lib/filters";
export type { TherapistFilter } from "@/modules/therapists/lib/filters";
