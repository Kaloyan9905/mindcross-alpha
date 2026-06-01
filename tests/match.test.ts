/**
 * Unit tests for the "Find your match" scoring. Pure functions — no DB.
 */
import { describe, expect, it } from "vitest";

import {
  rankMatches,
  scoreTherapist,
  type MatchAnswers,
  type MatchCandidate,
} from "@/modules/matching/lib/score-therapists";

function cand(over: Partial<MatchCandidate>): MatchCandidate {
  return {
    id: "t",
    slug: "t",
    displayName: "Test",
    photoUrl: null,
    bio: "",
    yearsOfExperience: 5,
    verified: false,
    languages: [],
    specializations: [],
    gender: null,
    migrationExperience: false,
    culturalBackground: [],
    ...over,
  };
}

const base: MatchAnswers = {
  language: "Ukrainian",
  concerns: [],
  genderPreference: "no_preference",
  wantsMigrationExperience: false,
};

describe("match scoring", () => {
  it("makes language the dominant signal", () => {
    const hit = scoreTherapist(cand({ languages: ["Ukrainian"] }), base);
    const miss = scoreTherapist(cand({ languages: ["English"] }), base);
    expect(hit.score).toBeGreaterThan(miss.score);
    expect(hit.reasons).toContain("Speaks Ukrainian");
  });

  it("matches language case-insensitively", () => {
    const r = scoreTherapist(cand({ languages: ["ukrainian"] }), base);
    expect(r.reasons).toContain("Speaks Ukrainian");
  });

  it("credits concerns, gender, and lived migration experience", () => {
    const r = scoreTherapist(
      cand({
        languages: ["Arabic"],
        specializations: ["Anxiety"],
        gender: "female",
        migrationExperience: true,
      }),
      {
        language: "Arabic",
        concerns: ["Anxiety"],
        genderPreference: "female",
        wantsMigrationExperience: true,
      },
    );
    expect(r.reasons).toEqual(
      expect.arrayContaining([
        "Speaks Arabic",
        "Supports Anxiety",
        "Female therapist",
        "Has lived migration experience",
      ]),
    );
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it("ranks the strongest fit first", () => {
    const answers: MatchAnswers = {
      language: "Ukrainian",
      concerns: ["Trauma"],
      genderPreference: "no_preference",
      wantsMigrationExperience: false,
    };
    const ranked = rankMatches(
      [
        cand({ id: "a", languages: ["English"] }),
        cand({ id: "b", languages: ["Ukrainian"], specializations: ["Trauma"] }),
        cand({ id: "c", languages: ["Ukrainian"] }),
      ],
      answers,
      5,
    );
    expect(ranked[0].therapist.id).toBe("b");
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });
});
