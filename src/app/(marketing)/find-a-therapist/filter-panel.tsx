"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Find-a-Therapist filters — deliberately simple.
 *
 * The one thing that matters most (the language you speak) leads, as big
 * tappable pills. Everything else (area of support, gender, migration, sort)
 * is folded behind a "More filters" toggle so the page isn't a wall of options
 * — especially on a phone, where the therapists should be reachable fast.
 *
 * The URL query string is the single source of truth; every control derives
 * its value from it and pushes an updated URL on change.
 */

const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];
const GENDER_ANY = "any";

const SORT_OPTIONS = [
  { value: "name", label: "Name (A–Z)" },
  { value: "experience", label: "Most experienced" },
  { value: "recent", label: "Recently added" },
];
const DEFAULT_SORT = "name";

type FilterState = {
  languages: string[];
  specializations: string[];
  gender: string;
  migrationExperience: boolean;
  sort: string;
};

function hrefFor(state: FilterState): string {
  const params = new URLSearchParams();
  for (const lang of state.languages) params.append("languages", lang);
  for (const spec of state.specializations) params.append("specializations", spec);
  if (state.gender !== GENDER_ANY) params.set("gender", state.gender);
  if (state.migrationExperience) params.set("migrationExperience", "true");
  if (state.sort && state.sort !== DEFAULT_SORT) params.set("sort", state.sort);
  const qs = params.toString();
  return qs ? `/find-a-therapist?${qs}` : "/find-a-therapist";
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

/** A tappable filter pill (44px touch target). */
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
        "inline-flex min-h-11 items-center rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary/50",
      )}
    >
      {children}
    </button>
  );
}

export interface FilterPanelProps {
  languageOptions: string[];
  specializationOptions: string[];
}

export function FilterPanel({
  languageOptions,
  specializationOptions,
}: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current: FilterState = React.useMemo(
    () => ({
      languages: searchParams.getAll("languages"),
      specializations: searchParams.getAll("specializations"),
      gender: searchParams.get("gender") ?? GENDER_ANY,
      migrationExperience: searchParams.get("migrationExperience") === "true",
      sort: searchParams.get("sort") ?? DEFAULT_SORT,
    }),
    [searchParams],
  );

  const advancedActive =
    current.specializations.length > 0 ||
    current.gender !== GENDER_ANY ||
    current.migrationExperience ||
    current.sort !== DEFAULT_SORT;
  const anyActive = current.languages.length > 0 || advancedActive;

  const [showMore, setShowMore] = React.useState(advancedActive);

  const apply = (next: FilterState) => router.push(hrefFor(next));

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6">
      {/* Primary: language */}
      <fieldset>
        <legend className="text-base font-semibold">
          Which language would you like your therapist to speak?
        </legend>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the one you feel most comfortable in. You can choose more than one.
        </p>
        {languageOptions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2.5">
            {languageOptions.map((lang) => (
              <Pill
                key={lang}
                active={current.languages.includes(lang)}
                onClick={() =>
                  apply({ ...current, languages: toggle(current.languages, lang) })
                }
              >
                {lang}
              </Pill>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No languages available yet.
          </p>
        )}
      </fieldset>

      {/* Progressive disclosure: everything else */}
      <div className="mt-6 border-t border-border pt-5">
        <button
          type="button"
          onClick={() => setShowMore((s) => !s)}
          aria-expanded={showMore}
          className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {showMore ? "Hide more filters" : "More filters"}
        </button>

        {showMore ? (
          <div className="mt-5 space-y-6">
            {/* Area of support */}
            <fieldset>
              <legend className="text-sm font-medium">
                What would you like help with?
              </legend>
              {specializationOptions.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {specializationOptions.map((spec) => (
                    <Pill
                      key={spec}
                      active={current.specializations.includes(spec)}
                      onClick={() =>
                        apply({
                          ...current,
                          specializations: toggle(current.specializations, spec),
                        })
                      }
                    >
                      {spec}
                    </Pill>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No areas available yet.
                </p>
              )}
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Gender */}
              <div className="space-y-1.5">
                <Label htmlFor="filter-gender">Therapist gender</Label>
                <Select
                  value={current.gender}
                  onValueChange={(value) => apply({ ...current, gender: value })}
                >
                  <SelectTrigger id="filter-gender">
                    <SelectValue placeholder="Any gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GENDER_ANY}>Any gender</SelectItem>
                    {GENDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="space-y-1.5">
                <Label htmlFor="filter-sort">Sort by</Label>
                <Select
                  value={current.sort}
                  onValueChange={(value) => apply({ ...current, sort: value })}
                >
                  <SelectTrigger id="filter-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Migration experience */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="filter-migration"
                checked={current.migrationExperience}
                onCheckedChange={(state) =>
                  apply({ ...current, migrationExperience: state === true })
                }
              />
              <Label
                htmlFor="filter-migration"
                className="font-normal leading-tight"
              >
                Only show therapists who have lived migration experience
                themselves.
              </Label>
            </div>
          </div>
        ) : null}
      </div>

      {anyActive ? (
        <div className="mt-5 border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/find-a-therapist")}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Clear all filters
          </Button>
        </div>
      ) : null}
    </div>
  );
}
