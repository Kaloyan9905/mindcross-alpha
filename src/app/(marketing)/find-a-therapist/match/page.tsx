import type { Metadata } from "next";

import { getFilterOptions } from "@/modules/matching";
import { MatchWizard } from "./match-wizard";

export const metadata: Metadata = {
  title: "Find your match — MindCross",
  description:
    "Answer a few questions and we'll find the therapists who fit you best — starting with your language.",
};

/** Cultural backgrounds offered as quick picks (people can skip this step). */
const CULTURE_OPTIONS = [
  "Ukrainian",
  "Russian",
  "Eastern European",
  "Polish",
  "Middle Eastern",
  "Arab",
  "Syrian",
  "Latin American",
  "South Asian",
  "African",
];

export default async function MatchPage() {
  const options = await getFilterOptions();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 sm:py-16 lg:px-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Find your match
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          A few quick questions, and we&rsquo;ll find the therapists who fit you
          best — starting with the language you feel most yourself in.
        </p>
      </header>
      <MatchWizard
        languageOptions={options.languages}
        specializationOptions={options.specializations}
        cultureOptions={CULTURE_OPTIONS}
      />
    </div>
  );
}
