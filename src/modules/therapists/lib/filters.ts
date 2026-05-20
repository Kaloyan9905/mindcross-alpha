import { z } from "zod";
import { THERAPIST_GENDERS } from "@/modules/therapists/db/schema";

/**
 * Validation schema for the public Find-a-Therapist filter form / query string.
 *
 * Matching at MVP is FILTERS ONLY — there is no relevance score. Every field
 * here is a hard filter applied as equality or array-overlap against the
 * `therapists` table.
 *
 * `page` / `pageSize` are part of the same schema so a route can parse the
 * whole `searchParams` object in one pass.
 */
export const therapistFilterSchema = z.object({
  /** Languages the therapist must speak (array-overlap: any match qualifies). */
  languages: z.array(z.string().min(1)).optional(),
  /** Specializations the therapist must offer (array-overlap). */
  specializations: z.array(z.string().min(1)).optional(),
  /** Exact therapist gender. */
  gender: z.enum(THERAPIST_GENDERS).optional(),
  /** Whether the therapist must have lived migration experience. */
  migrationExperience: z.boolean().optional(),
  /** 1-based page index. */
  page: z.coerce.number().int().min(1).default(1),
  /** Results per page. */
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

/** Parsed, validated therapist filter input. */
export type TherapistFilter = z.infer<typeof therapistFilterSchema>;
