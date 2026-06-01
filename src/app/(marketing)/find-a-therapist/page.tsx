import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Sparkles } from "lucide-react";

import {
  findTherapists,
  getFilterOptions,
  therapistFilterSchema,
  type TherapistFilter,
  type TherapistSummary,
} from "@/modules/matching";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyIllustration } from "@/components/shared/empty-illustration";
import { FilterPanel } from "./filter-panel";

export const metadata: Metadata = {
  title: "Find a Therapist — MindCross",
  description:
    "Search culturally-matched therapists by language, specialization, and more. Free sessions during early access.",
};

type SearchParams = Record<string, string | string[] | undefined>;

/** Normalize a raw searchParams value into a string array (for multi-value keys). */
function toArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const arr = Array.isArray(value) ? value : [value];
  const cleaned = arr.filter((v) => v.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "MC";
}

/** Lower-cased set of selected values, for case-insensitive match checks. */
function toMatchSet(values: readonly string[] | undefined): Set<string> {
  return new Set((values ?? []).map((v) => v.toLowerCase()));
}

/** Items the therapist has that the user selected, sorted to the front. */
function matchedFirst(items: readonly string[], selected: Set<string>): string[] {
  return [...items].sort((a, b) => {
    const am = selected.has(a.toLowerCase()) ? 0 : 1;
    const bm = selected.has(b.toLowerCase()) ? 0 : 1;
    return am - bm;
  });
}

/** Build an href to the find page with a partial set of params overridden. */
function buildHref(base: TherapistFilter, overrides: { page: number }): string {
  const params = new URLSearchParams();
  for (const lang of base.languages ?? []) params.append("languages", lang);
  for (const spec of base.specializations ?? [])
    params.append("specializations", spec);
  if (base.gender) params.set("gender", base.gender);
  if (base.migrationExperience) params.set("migrationExperience", "true");
  if (base.sort && base.sort !== "name") params.set("sort", base.sort);
  params.set("page", String(overrides.page));
  return `/find-a-therapist?${params.toString()}`;
}

function TherapistCard({
  therapist,
  matchLanguages,
  matchSpecializations,
  index = 0,
}: {
  therapist: TherapistSummary;
  matchLanguages: Set<string>;
  matchSpecializations: Set<string>;
  index?: number;
}) {
  const languages = matchedFirst(therapist.languages, matchLanguages);
  const specializations = matchedFirst(
    therapist.specializations,
    matchSpecializations,
  );
  const matchCount =
    therapist.languages.filter((l) => matchLanguages.has(l.toLowerCase()))
      .length +
    therapist.specializations.filter((s) =>
      matchSpecializations.has(s.toLowerCase()),
    ).length;

  return (
    <Link
      href={`/therapists/${therapist.slug}`}
      style={{ animationDelay: `${Math.min(index, 9) * 50}ms` }}
      className="animate-rise card-lift group flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-soft hover:border-primary/30 hover:shadow-soft-lg"
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14">
          {therapist.photoUrl ? (
            <AvatarImage src={therapist.photoUrl} alt="" />
          ) : null}
          <AvatarFallback className="text-sm font-medium">
            {initialsFor(therapist.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold">
            {therapist.displayName}
            {therapist.verified ? (
              <BadgeCheck
                className="h-4 w-4 shrink-0 text-primary"
                aria-label="Verified therapist"
              />
            ) : null}
          </p>
          <p className="text-sm text-muted-foreground">
            {therapist.yearsOfExperience}{" "}
            {therapist.yearsOfExperience === 1 ? "year" : "years"} of experience
          </p>
        </div>
      </div>

      {matchCount > 0 ? (
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Matches {matchCount} of your {matchCount === 1 ? "filter" : "filters"}
        </p>
      ) : null}

      {languages.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Speaks
          </p>
          <div className="flex flex-wrap gap-1.5">
            {languages.map((lang) => {
              const matched = matchLanguages.has(lang.toLowerCase());
              return (
                <Badge
                  key={lang}
                  variant={matched ? "success" : "secondary"}
                  className={matched ? "gap-1" : undefined}
                >
                  {matched ? (
                    <Check className="h-3 w-3" aria-hidden="true" />
                  ) : null}
                  {lang}
                </Badge>
              );
            })}
          </div>
        </div>
      ) : null}

      {specializations.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Areas of support
          </p>
          <div className="flex flex-wrap gap-1.5">
            {specializations.map((spec) => {
              const matched = matchSpecializations.has(spec.toLowerCase());
              return (
                <Badge
                  key={spec}
                  variant={matched ? "success" : "outline"}
                  className={matched ? "gap-1" : undefined}
                >
                  {matched ? (
                    <Check className="h-3 w-3" aria-hidden="true" />
                  ) : null}
                  {spec}
                </Badge>
              );
            })}
          </div>
        </div>
      ) : null}

      <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        {therapist.bio}
      </p>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
        View profile
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

export default async function FindATherapistPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;

  // Validate the query string with the matching module's schema. The schema
  // coerces page/pageSize and ignores unknown keys; on a bad query we fall
  // back to defaults rather than 500-ing the page.
  const parsed = therapistFilterSchema.safeParse({
    languages: toArray(raw.languages),
    specializations: toArray(raw.specializations),
    gender: typeof raw.gender === "string" ? raw.gender : undefined,
    migrationExperience: raw.migrationExperience === "true" ? true : undefined,
    sort: typeof raw.sort === "string" ? raw.sort : undefined,
    page: raw.page,
    pageSize: raw.pageSize,
  });
  const filter: TherapistFilter = parsed.success
    ? parsed.data
    : therapistFilterSchema.parse({});

  const [options, result] = await Promise.all([
    getFilterOptions(),
    findTherapists(filter),
  ]);

  const { items, total, page, pageSize } = result;
  const matchLanguages = toMatchSet(filter.languages);
  const matchSpecializations = toMatchSet(filter.specializations);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Find a therapist
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Start with your language — then browse. Take your time, there&rsquo;s
          no wrong choice.
        </p>
      </header>

      {/* Match-quiz CTA — the differentiator: a guided, scored match */}
      <Link
        href="/find-a-therapist/match"
        className="card-lift mt-8 flex items-center gap-4 rounded-xl border border-primary/20 bg-gradient-to-r from-secondary/60 to-accent/40 p-5 shadow-soft hover:border-primary/40"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Not sure where to start?</span>
          <span className="block text-sm text-muted-foreground">
            Answer a few questions and we&rsquo;ll find your best matches — in
            about a minute.
          </span>
        </span>
        <ArrowRight
          className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>

      {/* Filters — one calm card, advanced options folded away */}
      <div className="mt-8">
        <FilterPanel
          languageOptions={options.languages}
          specializationOptions={options.specializations}
        />
      </div>

      {/* Results */}
      <section aria-label="Therapist results" className="mt-10">
        <p className="mb-6 text-sm text-muted-foreground" aria-live="polite">
          {total === 0
            ? "No therapists found"
            : `Showing ${rangeStart}–${rangeEnd} of ${total} ${
                total === 1 ? "therapist" : "therapists"
              }`}
        </p>

        {items.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((therapist, index) => (
                <TherapistCard
                  key={therapist.id}
                  therapist={therapist}
                  matchLanguages={matchLanguages}
                  matchSpecializations={matchSpecializations}
                  index={index}
                />
              ))}
            </div>

            {totalPages > 1 ? (
                <nav
                  aria-label="Pagination"
                  className="mt-12 flex items-center justify-between gap-4"
                >
                  {hasPrev ? (
                    <Button asChild variant="outline">
                      <Link href={buildHref(filter, { page: page - 1 })}>
                        <ArrowLeft aria-hidden="true" />
                        Previous
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>
                      <ArrowLeft aria-hidden="true" />
                      Previous
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  {hasNext ? (
                    <Button asChild variant="outline">
                      <Link href={buildHref(filter, { page: page + 1 })}>
                        Next
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>
                      Next
                      <ArrowRight aria-hidden="true" />
                    </Button>
                  )}
                </nav>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-16 text-center shadow-soft">
              <EmptyIllustration name="search" className="mb-3" />
              <p className="font-semibold">
                No therapists match these filters yet
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Try broadening your search — removing a filter or two often
                helps.
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link href="/find-a-therapist">Clear all filters</Link>
              </Button>
            </div>
          )}
        </section>
    </div>
  );
}
