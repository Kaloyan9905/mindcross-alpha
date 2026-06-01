import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { therapists } from "@/modules/therapists/db/schema";
import {
  rankMatches,
  type MatchAnswers,
  type MatchCandidate,
  type MatchResult,
} from "../lib/score-therapists";

const BIO_PREVIEW = 200;

function truncate(bio: string): string {
  return bio.length <= BIO_PREVIEW
    ? bio
    : `${bio.slice(0, BIO_PREVIEW).trimEnd()}…`;
}

/**
 * Load every active therapist and rank them against the quiz answers. Scoring
 * happens in memory (a few hundred therapists at most) so the weighting logic
 * stays in one testable pure function.
 */
export async function findMatches(
  answers: MatchAnswers,
  limit = 5,
): Promise<MatchResult[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: therapists.id,
      slug: therapists.slug,
      displayName: therapists.displayName,
      photoUrl: therapists.photoUrl,
      bio: therapists.bio,
      yearsOfExperience: therapists.yearsOfExperience,
      verified: therapists.verified,
      languages: therapists.languages,
      specializations: therapists.specializations,
      gender: therapists.gender,
      migrationExperience: therapists.migrationExperience,
      culturalBackground: therapists.culturalBackground,
    })
    .from(therapists)
    .where(eq(therapists.status, "active"))
    .limit(500);

  const candidates: MatchCandidate[] = rows.map((r) => ({
    ...r,
    bio: truncate(r.bio),
  }));
  return rankMatches(candidates, answers, limit);
}
