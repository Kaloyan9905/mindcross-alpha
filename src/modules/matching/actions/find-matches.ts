"use server";

import { z } from "zod";
import { THERAPIST_GENDERS } from "@/modules/therapists/db/schema";
import { findMatches } from "../queries/find-matches";
import type { MatchResult } from "../lib/score-therapists";

const GENDER_PREFERENCES = [...THERAPIST_GENDERS, "no_preference"] as const;

const schema = z.object({
  language: z.string().trim().min(1, "Choose a language.").max(60),
  concerns: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  genderPreference: z.enum(GENDER_PREFERENCES).default("no_preference"),
  wantsMigrationExperience: z.boolean().default(false),
  culturalBackground: z.string().trim().max(80).optional(),
});

export type FindMatchesResult =
  | { ok: true; matches: MatchResult[] }
  | { ok: false; error: string };

/**
 * Public action: rank therapists for the "Find your match" quiz. No auth — this
 * is open to visitors so they can see their best matches before signing up.
 */
export async function findMatchesAction(
  input: unknown,
): Promise<FindMatchesResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please answer the questions first.",
    };
  }
  const matches = await findMatches(parsed.data, 5);
  return { ok: true, matches };
}
