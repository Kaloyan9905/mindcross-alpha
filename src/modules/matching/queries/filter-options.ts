import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { therapists } from "@/modules/therapists/db/schema";

/** Distinct filter vocabularies available across all `active` therapists. */
export type FilterOptions = {
  languages: string[];
  specializations: string[];
};

/**
 * Collect the distinct, sorted set of `languages` and `specializations` across
 * every `active` therapist. Used to populate the Find-a-Therapist filter
 * dropdowns so the UI never offers a filter value that returns zero results.
 *
 * The array columns are flattened with `unnest` and de-duplicated in SQL.
 */
export async function getFilterOptions(): Promise<FilterOptions> {
  const db = getDb();

  const [languageRows, specializationRows] = await Promise.all([
    db
      .select({
        value: sql<string>`distinct unnest(${therapists.languages})`,
      })
      .from(therapists)
      .where(sql`${therapists.status} = 'active'`)
      .limit(500),
    db
      .select({
        value: sql<string>`distinct unnest(${therapists.specializations})`,
      })
      .from(therapists)
      .where(sql`${therapists.status} = 'active'`)
      .limit(500),
  ]);

  const languages = languageRows
    .map((r) => r.value)
    .filter((v): v is string => Boolean(v))
    .sort((a, b) => a.localeCompare(b));

  const specializations = specializationRows
    .map((r) => r.value)
    .filter((v): v is string => Boolean(v))
    .sort((a, b) => a.localeCompare(b));

  return { languages, specializations };
}
