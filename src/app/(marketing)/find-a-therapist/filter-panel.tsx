"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Client filter panel for the Find-a-Therapist page.
 *
 * The URL query string is the single source of truth — there is no local
 * mirror of the filters. Every control derives its value from `searchParams`
 * and, on change, pushes an updated URL; the server page then re-runs the
 * search. Any filter change resets pagination to page 1.
 */

const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

/** Sentinel for the "Any" Select option — Radix Select cannot use an empty value. */
const GENDER_ANY = "any";

type FilterState = {
  languages: string[];
  specializations: string[];
  gender: string;
  migrationExperience: boolean;
};

/** Build the find-a-therapist URL from a filter state (page is reset to 1). */
function hrefFor(state: FilterState): string {
  const params = new URLSearchParams();
  for (const lang of state.languages) params.append("languages", lang);
  for (const spec of state.specializations)
    params.append("specializations", spec);
  if (state.gender !== GENDER_ANY) params.set("gender", state.gender);
  if (state.migrationExperience) params.set("migrationExperience", "true");
  const qs = params.toString();
  return qs ? `/find-a-therapist?${qs}` : "/find-a-therapist";
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

  // Derive the current filters straight from the URL — no local state.
  const current: FilterState = React.useMemo(
    () => ({
      languages: searchParams.getAll("languages"),
      specializations: searchParams.getAll("specializations"),
      gender: searchParams.get("gender") ?? GENDER_ANY,
      migrationExperience: searchParams.get("migrationExperience") === "true",
    }),
    [searchParams],
  );

  const apply = (next: FilterState) => {
    router.push(hrefFor(next));
  };

  const toggleLanguage = (value: string, checked: boolean) => {
    apply({
      ...current,
      languages: checked
        ? [...current.languages, value]
        : current.languages.filter((v) => v !== value),
    });
  };

  const toggleSpecialization = (value: string, checked: boolean) => {
    apply({
      ...current,
      specializations: checked
        ? [...current.specializations, value]
        : current.specializations.filter((v) => v !== value),
    });
  };

  const changeGender = (value: string) => {
    apply({ ...current, gender: value });
  };

  const toggleMigration = (checked: boolean) => {
    apply({ ...current, migrationExperience: checked });
  };

  const hasActiveFilters =
    current.languages.length > 0 ||
    current.specializations.length > 0 ||
    current.gender !== GENDER_ANY ||
    current.migrationExperience;

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-sm font-semibold">Filters</h2>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/find-a-therapist")}
            className="h-auto px-2 py-1 text-xs"
          >
            Clear all
          </Button>
        ) : null}
      </div>

      {/* Languages */}
      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Language</legend>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The language you’d like your therapist to speak.
        </p>
        {languageOptions.length > 0 ? (
          <div className="mt-3 space-y-2.5">
            {languageOptions.map((option) => {
              const id = `lang-${option}`;
              const checked = current.languages.includes(option);
              return (
                <div key={option} className="flex items-center gap-2.5">
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={(state) =>
                      toggleLanguage(option, state === true)
                    }
                  />
                  <Label htmlFor={id} className="font-normal">
                    {option}
                  </Label>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No languages available yet.
          </p>
        )}
      </fieldset>

      <Separator className="my-5" />

      {/* Specializations */}
      <fieldset>
        <legend className="text-sm font-medium">Area of support</legend>
        <p className="mt-0.5 text-xs text-muted-foreground">
          What you’d like help with.
        </p>
        {specializationOptions.length > 0 ? (
          <div className="mt-3 space-y-2.5">
            {specializationOptions.map((option) => {
              const id = `spec-${option}`;
              const checked = current.specializations.includes(option);
              return (
                <div key={option} className="flex items-center gap-2.5">
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={(state) =>
                      toggleSpecialization(option, state === true)
                    }
                  />
                  <Label htmlFor={id} className="font-normal">
                    {option}
                  </Label>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No areas available yet.
          </p>
        )}
      </fieldset>

      <Separator className="my-5" />

      {/* Gender */}
      <div className="space-y-2">
        <Label htmlFor="filter-gender">Therapist gender</Label>
        <Select value={current.gender} onValueChange={changeGender}>
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

      <Separator className="my-5" />

      {/* Migration experience */}
      <div className="flex items-start gap-2.5">
        <Checkbox
          id="filter-migration"
          checked={current.migrationExperience}
          onCheckedChange={(state) => toggleMigration(state === true)}
        />
        <div>
          <Label htmlFor="filter-migration" className="font-normal">
            Has lived migration experience
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A therapist who has moved countries themselves.
          </p>
        </div>
      </div>
    </div>
  );
}
