import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, SearchX } from "lucide-react";

import {
  findTherapists,
  getFilterOptions,
  therapistFilterSchema,
  type TherapistFilter,
  type TherapistSummary,
} from "@/modules/matching";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

/** Build an href to the find page with a partial set of params overridden. */
function buildHref(base: TherapistFilter, overrides: { page: number }): string {
  const params = new URLSearchParams();
  for (const lang of base.languages ?? []) params.append("languages", lang);
  for (const spec of base.specializations ?? [])
    params.append("specializations", spec);
  if (base.gender) params.set("gender", base.gender);
  if (base.migrationExperience) params.set("migrationExperience", "true");
  params.set("page", String(overrides.page));
  return `/find-a-therapist?${params.toString()}`;
}

function TherapistCard({ therapist }: { therapist: TherapistSummary }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-start gap-4 space-y-0">
        <Avatar className="h-16 w-16">
          {therapist.photoUrl ? (
            <AvatarImage src={therapist.photoUrl} alt="" />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
            {initialsFor(therapist.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <CardTitle className="text-lg">{therapist.displayName}</CardTitle>
          <CardDescription>
            {therapist.yearsOfExperience}{" "}
            {therapist.yearsOfExperience === 1 ? "year" : "years"} of experience
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {therapist.languages.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Speaks
            </p>
            <div className="flex flex-wrap gap-1.5">
              {therapist.languages.map((lang) => (
                <Badge key={lang} variant="tertiary">
                  {lang}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
        {therapist.specializations.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Areas of support
            </p>
            <div className="flex flex-wrap gap-1.5">
              {therapist.specializations.map((spec) => (
                <Badge key={spec} variant="secondary">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
          {therapist.bio}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/therapists/${therapist.slug}`}>View profile</Link>
        </Button>
      </CardFooter>
    </Card>
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Find a therapist
        </h1>
        <p className="mt-3 text-muted-foreground">
          Filter by the language you feel most comfortable in and the support
          you’re looking for. Take your time — there’s no wrong choice.
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[18rem_1fr]">
        {/* Filters */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <FilterPanel
            languageOptions={options.languages}
            specializationOptions={options.specializations}
          />
        </aside>

        {/* Results */}
        <section aria-label="Therapist results">
          <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
            {total === 0
              ? "No therapists found"
              : `Showing ${rangeStart}–${rangeEnd} of ${total} ${
                  total === 1 ? "therapist" : "therapists"
                }`}
          </p>

          {items.length > 0 ? (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((therapist) => (
                  <TherapistCard key={therapist.id} therapist={therapist} />
                ))}
              </div>

              {totalPages > 1 ? (
                <nav
                  aria-label="Pagination"
                  className="mt-10 flex items-center justify-between gap-4"
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
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <span
                  aria-hidden="true"
                  className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground"
                >
                  <SearchX className="h-6 w-6" />
                </span>
                <p className="font-heading text-lg font-semibold">
                  No therapists match these filters yet
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  No therapists match these filters yet — try broadening your
                  search.
                </p>
                <Button asChild variant="outline" className="mt-2">
                  <Link href="/find-a-therapist">Clear all filters</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
