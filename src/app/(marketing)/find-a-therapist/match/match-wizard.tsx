"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Sparkles } from "lucide-react";

import { findMatchesAction } from "@/modules/matching/actions/find-matches";
import type { MatchResult } from "@/modules/matching/lib/score-therapists";
import type { TherapistGender } from "@/modules/therapists/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GenderPref = TherapistGender | "no_preference";

interface Answers {
  language: string;
  concerns: string[];
  genderPreference: GenderPref;
  wantsMigrationExperience: boolean;
  culturalBackground: string;
}

const GENDER_CHOICES: { value: GenderPref; label: string }[] = [
  { value: "no_preference", label: "No preference" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
];

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary/50",
      )}
    >
      {active ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "MC";
}

function scoreTone(score: number): string {
  if (score >= 75) return "bg-success text-success-foreground";
  if (score >= 50) return "bg-accent text-accent-foreground";
  return "bg-secondary text-secondary-foreground";
}

const STEPS = ["Language", "Support", "Preferences"] as const;

export function MatchWizard({
  languageOptions,
  specializationOptions,
  cultureOptions,
}: {
  languageOptions: string[];
  specializationOptions: string[];
  cultureOptions: string[];
}) {
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Answers>({
    language: "",
    concerns: [],
    genderPreference: "no_preference",
    wantsMigrationExperience: false,
    culturalBackground: "",
  });
  const [pending, startTransition] = React.useTransition();
  const [matches, setMatches] = React.useState<MatchResult[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function toggleConcern(c: string) {
    setAnswers((a) => ({
      ...a,
      concerns: a.concerns.includes(c)
        ? a.concerns.filter((x) => x !== c)
        : [...a.concerns, c],
    }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await findMatchesAction(answers);
      if (result.ok) setMatches(result.matches);
      else setError(result.error);
    });
  }

  function restart() {
    setMatches(null);
    setStep(0);
    setAnswers({
      language: "",
      concerns: [],
      genderPreference: "no_preference",
      wantsMigrationExperience: false,
      culturalBackground: "",
    });
  }

  // --- Results view ---
  if (matches) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            {matches.length > 0 ? "Your best matches" : "No matches yet"}
          </h2>
          <Button variant="ghost" size="sm" onClick={restart}>
            Start over
          </Button>
        </div>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              We couldn&rsquo;t find a therapist for those answers yet. Try
              broadening them, or{" "}
              <Link href="/find-a-therapist" className="text-primary underline-offset-4 hover:underline">
                browse everyone
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          matches.map((m, i) => (
            <Card
              key={m.therapist.id}
              className="animate-rise ring-1 ring-primary/5"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
                <Avatar className="h-14 w-14 shrink-0">
                  {m.therapist.photoUrl ? (
                    <AvatarImage src={m.therapist.photoUrl} alt="" />
                  ) : null}
                  <AvatarFallback className="text-sm font-medium">
                    {initials(m.therapist.displayName)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{m.therapist.displayName}</span>
                    {m.therapist.verified ? (
                      <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verified" />
                    ) : null}
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        scoreTone(m.score),
                      )}
                    >
                      {m.score}% match
                    </span>
                  </div>
                  {m.reasons.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.reasons.map((r) => (
                        <Badge key={r} variant="secondary" className="font-normal">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>

                <Button asChild size="sm" className="shrink-0">
                  <Link href={`/therapists/${m.therapist.slug}`}>View profile</Link>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  }

  // --- Wizard ---
  const canNext =
    step === 0 ? answers.language.length > 0 : true;
  const isLast = step === STEPS.length - 1;

  return (
    <Card>
      <CardContent className="space-y-6 py-6">
        {/* Progress */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-1.5">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-muted",
                )}
              />
              <span
                className={cn(
                  "text-[11px]",
                  i === step ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Step 0 — language */}
        {step === 0 ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              Which language do you feel most yourself in?
            </h2>
            <p className="text-sm text-muted-foreground">
              This matters most — being understood in your own language changes
              everything.
            </p>
            <div className="flex flex-wrap gap-2">
              {languageOptions.map((lang) => (
                <Pill
                  key={lang}
                  active={answers.language === lang}
                  onClick={() => setAnswers((a) => ({ ...a, language: lang }))}
                >
                  {lang}
                </Pill>
              ))}
            </div>
          </div>
        ) : null}

        {/* Step 1 — concerns */}
        {step === 1 ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              What would you like support with?
            </h2>
            <p className="text-sm text-muted-foreground">
              Pick any that fit — or none, it&rsquo;s okay not to be sure.
            </p>
            <div className="flex flex-wrap gap-2">
              {specializationOptions.map((spec) => (
                <Pill
                  key={spec}
                  active={answers.concerns.includes(spec)}
                  onClick={() => toggleConcern(spec)}
                >
                  {spec}
                </Pill>
              ))}
            </div>
          </div>
        ) : null}

        {/* Step 2 — preferences */}
        {step === 2 ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">
                A therapist of a particular gender?
              </h2>
              <div className="flex flex-wrap gap-2">
                {GENDER_CHOICES.map((g) => (
                  <Pill
                    key={g.value}
                    active={answers.genderPreference === g.value}
                    onClick={() =>
                      setAnswers((a) => ({ ...a, genderPreference: g.value }))
                    }
                  >
                    {g.label}
                  </Pill>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">
                Someone who&rsquo;s been through migration themselves?
              </h2>
              <div className="flex flex-wrap gap-2">
                <Pill
                  active={answers.wantsMigrationExperience}
                  onClick={() =>
                    setAnswers((a) => ({ ...a, wantsMigrationExperience: true }))
                  }
                >
                  Yes, that would help
                </Pill>
                <Pill
                  active={!answers.wantsMigrationExperience}
                  onClick={() =>
                    setAnswers((a) => ({ ...a, wantsMigrationExperience: false }))
                  }
                >
                  Doesn&rsquo;t matter
                </Pill>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">
                Your cultural background{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  (optional)
                </span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {cultureOptions.map((c) => (
                  <Pill
                    key={c}
                    active={answers.culturalBackground === c}
                    onClick={() =>
                      setAnswers((a) => ({
                        ...a,
                        culturalBackground: a.culturalBackground === c ? "" : c,
                      }))
                    }
                  >
                    {c}
                  </Pill>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {/* Nav */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
          ) : (
            <Button variant="ghost" asChild>
              <Link href="/find-a-therapist">Browse instead</Link>
            </Button>
          )}

          {isLast ? (
            <Button onClick={submit} disabled={pending}>
              {pending ? "Finding…" : "See my matches"}
              <Sparkles aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Next
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
