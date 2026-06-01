// Public API for the `matching` module. Filters-only search over `active`
// therapists — there is no scoring / ranking at MVP.

export { findTherapists } from "./queries/find-therapists";
export type {
  TherapistSummary,
  FindTherapistsResult,
} from "./queries/find-therapists";

export { getFilterOptions } from "./queries/filter-options";
export type { FilterOptions } from "./queries/filter-options";

// "Find your match" — language/culture-first scored matching.
export { findMatchesAction } from "./actions/find-matches";
export type { FindMatchesResult } from "./actions/find-matches";
export { findMatches } from "./queries/find-matches";
export { scoreTherapist, rankMatches } from "./lib/score-therapists";
export type {
  MatchAnswers,
  MatchCandidate,
  MatchResult,
} from "./lib/score-therapists";

// Re-export the filter schema/type so the public find-therapist page can
// validate its search params without reaching into the therapists module.
export { therapistFilterSchema } from "@/modules/therapists/lib/filters";
export type { TherapistFilter } from "@/modules/therapists/lib/filters";
