import type { TherapistGender } from "@/modules/therapists/db/schema";

/**
 * MindCross's differentiator: a transparent, language- and culture-FIRST match
 * score. Unlike a generic "fill a form, browse a list" flow, we rank therapists
 * by how well they fit the person AND explain why (the `reasons`).
 *
 * Scoring is a pure function so it is fully testable. Weights put LANGUAGE far
 * above everything else — feeling understood in your own language is the whole
 * point — then lived migration experience, what you need help with, gender, and
 * cultural background.
 */
export interface MatchAnswers {
  /** The language the person feels most themselves in. */
  language: string;
  /** What they'd like support with (specialization names). */
  concerns: string[];
  /** Preferred therapist gender, or "no_preference". */
  genderPreference: TherapistGender | "no_preference";
  /** Prefer a therapist who has lived migration experience. */
  wantsMigrationExperience: boolean;
  /** Optional: their cultural background, for a cultural match. */
  culturalBackground?: string;
}

/** Therapist fields needed to score + display a match. */
export interface MatchCandidate {
  id: string;
  slug: string;
  displayName: string;
  photoUrl: string | null;
  bio: string;
  yearsOfExperience: number;
  verified: boolean;
  languages: string[];
  specializations: string[];
  gender: TherapistGender | null;
  migrationExperience: boolean;
  culturalBackground: string[];
}

export interface MatchResult {
  therapist: {
    id: string;
    slug: string;
    displayName: string;
    photoUrl: string | null;
    bio: string;
    yearsOfExperience: number;
    verified: boolean;
    languages: string[];
    specializations: string[];
  };
  /** 0–100, relative to what the person actually asked for. */
  score: number;
  /** Plain-language reasons this therapist matched (for the card). */
  reasons: string[];
}

const W_LANGUAGE = 50;
const W_CONCERN = 12;
const MAX_CONCERN_MATCHES = 3;
const W_GENDER = 14;
const W_MIGRATION = 14;
const W_CULTURE = 12;
const W_EXPERIENCE = 5; // baseline, scaled by years
const W_VERIFIED = 3;

const GENDER_LABEL: Record<TherapistGender, string> = {
  female: "Female",
  male: "Male",
  non_binary: "Non-binary",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

function lc(s: string): string {
  return s.trim().toLowerCase();
}

/** Score a single therapist against the answers, with explanations. */
export function scoreTherapist(
  candidate: MatchCandidate,
  answers: MatchAnswers,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let raw = 0;
  let max = 0;

  // Language — the dominant signal.
  max += W_LANGUAGE;
  const langs = new Set(candidate.languages.map(lc));
  if (answers.language && langs.has(lc(answers.language))) {
    raw += W_LANGUAGE;
    reasons.push(`Speaks ${answers.language}`);
  }

  // Concerns / specializations.
  const concerns = answers.concerns.slice(0, MAX_CONCERN_MATCHES);
  if (concerns.length > 0) {
    max += concerns.length * W_CONCERN;
    const specs = new Set(candidate.specializations.map(lc));
    for (const c of concerns) {
      if (specs.has(lc(c))) {
        raw += W_CONCERN;
        reasons.push(`Supports ${c}`);
      }
    }
  }

  // Gender preference.
  if (answers.genderPreference !== "no_preference") {
    max += W_GENDER;
    if (candidate.gender === answers.genderPreference) {
      raw += W_GENDER;
      reasons.push(`${GENDER_LABEL[answers.genderPreference]} therapist`);
    }
  }

  // Lived migration experience.
  if (answers.wantsMigrationExperience) {
    max += W_MIGRATION;
    if (candidate.migrationExperience) {
      raw += W_MIGRATION;
      reasons.push("Has lived migration experience");
    }
  }

  // Cultural background.
  const culture = answers.culturalBackground?.trim();
  if (culture) {
    max += W_CULTURE;
    const cultures = new Set(candidate.culturalBackground.map(lc));
    if (cultures.has(lc(culture))) {
      raw += W_CULTURE;
      reasons.push(`Understands ${culture} background`);
    }
  }

  // Experience (baseline, always achievable) + verified trust.
  max += W_EXPERIENCE + W_VERIFIED;
  raw += Math.min(candidate.yearsOfExperience, 10) * (W_EXPERIENCE / 10);
  if (candidate.verified) {
    raw += W_VERIFIED;
    reasons.push("Verified");
  }

  const score = max > 0 ? Math.round((raw / max) * 100) : 0;
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

/** Rank candidates best-first, returning the top `limit` with scores + reasons. */
export function rankMatches(
  candidates: MatchCandidate[],
  answers: MatchAnswers,
  limit = 5,
): MatchResult[] {
  return candidates
    .map((c) => {
      const { score, reasons } = scoreTherapist(c, answers);
      return {
        therapist: {
          id: c.id,
          slug: c.slug,
          displayName: c.displayName,
          photoUrl: c.photoUrl,
          bio: c.bio,
          yearsOfExperience: c.yearsOfExperience,
          verified: c.verified,
          languages: c.languages,
          specializations: c.specializations,
        },
        score,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score || b.therapist.yearsOfExperience - a.therapist.yearsOfExperience)
    .slice(0, limit);
}
