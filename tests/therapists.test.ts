/**
 * Integration tests for the therapists / matching modules against the live
 * seeded database (10 active therapists, 38 availability slots, 3 pending
 * applications). Read-only — no cleanup needed.
 */
import { describe, expect, it } from "vitest";

import {
  findTherapists,
  getFilterOptions,
  therapistFilterSchema,
} from "@/modules/matching";
import {
  getTherapistBySlug,
  listPendingApplications,
} from "@/modules/therapists";

// `findTherapists` destructures `page` / `pageSize` directly — it does not
// parse its input. Parsing through the schema applies the defaults the public
// route relies on, matching real usage.
function parseFilter(input: Record<string, unknown>) {
  return therapistFilterSchema.parse(input);
}

describe("findTherapists", () => {
  it("returns the seeded active therapists with a correct total", async () => {
    const result = await findTherapists(parseFilter({}));

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThanOrEqual(10);
    // Default page/pageSize from the schema.
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(12);
  });

  it("filters by a seeded language and returns only matching therapists", async () => {
    // 'Ukrainian' is spoken by Olena Kovalenko, Dmytro Shevchenko, Yuliia Boiko.
    const result = await findTherapists(
      parseFilter({ languages: ["Ukrainian"] }),
    );

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThanOrEqual(3);
    for (const therapist of result.items) {
      expect(therapist.languages).toContain("Ukrainian");
    }

    // The language filter must actually narrow the set.
    const unfiltered = await findTherapists(parseFilter({}));
    expect(result.total).toBeLessThanOrEqual(unfiltered.total);
  });
});

describe("getFilterOptions", () => {
  it("returns non-empty languages and specializations vocabularies", async () => {
    const options = await getFilterOptions();

    expect(Array.isArray(options.languages)).toBe(true);
    expect(Array.isArray(options.specializations)).toBe(true);
    expect(options.languages.length).toBeGreaterThan(0);
    expect(options.specializations.length).toBeGreaterThan(0);
    // Seed sanity check.
    expect(options.languages).toContain("Ukrainian");
  });
});

describe("getTherapistBySlug", () => {
  it("returns a full profile with a slots array for a real slug", async () => {
    // Resolve a real slug from the seeded set rather than hard-coding it.
    const list = await findTherapists(
      therapistFilterSchema.parse({ pageSize: 1 }),
    );
    const slug = list.items[0]?.slug;
    expect(slug).toBeTypeOf("string");

    const profile = await getTherapistBySlug(slug as string);
    expect(profile).not.toBeNull();
    expect(profile?.slug).toBe(slug);
    expect(Array.isArray(profile?.slots)).toBe(true);
    expect(profile?.displayName).toBeTypeOf("string");
  });

  it("returns null for a nonsense slug", async () => {
    const profile = await getTherapistBySlug(
      "this-slug-definitely-does-not-exist-9999",
    );
    expect(profile).toBeNull();
  });
});

describe("listPendingApplications", () => {
  it("returns at least the 3 seeded pending applications", async () => {
    const applications = await listPendingApplications();

    expect(Array.isArray(applications)).toBe(true);
    expect(applications.length).toBeGreaterThanOrEqual(3);
    // The query only returns 'pending' / 'info_requested' rows.
    for (const application of applications) {
      expect(["pending", "info_requested"]).toContain(application.status);
    }
  });
});
