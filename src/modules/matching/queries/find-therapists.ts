import { type SQL, and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  type TherapistGender,
  therapists,
} from "@/modules/therapists/db/schema";
import type { TherapistFilter } from "@/modules/therapists/lib/filters";

/** Max bio length surfaced in list/card views before truncation. */
const BIO_PREVIEW_LENGTH = 200;

/**
 * Public-facing projection of a therapist for list / card UIs. Intentionally
 * omits internal columns (email, phone, sessionUrl, userId, status, timestamps,
 * pricing). The `bio` here is a truncated preview — fetch the full profile via
 * `getTherapistBySlug` for the detail page.
 */
export type TherapistSummary = {
  id: string;
  slug: string;
  displayName: string;
  photoUrl: string | null;
  /** Truncated to ~200 chars with an ellipsis when longer. */
  bio: string;
  yearsOfExperience: number;
  languages: string[];
  specializations: string[];
  gender: TherapistGender | null;
  verified: boolean;
};

/** Paginated result envelope returned by `findTherapists`. */
export type FindTherapistsResult = {
  items: TherapistSummary[];
  total: number;
  page: number;
  pageSize: number;
};

/** Truncate a bio to the preview length without cutting mid-display abruptly. */
function truncateBio(bio: string): string {
  if (bio.length <= BIO_PREVIEW_LENGTH) return bio;
  return `${bio.slice(0, BIO_PREVIEW_LENGTH).trimEnd()}…`;
}

/**
 * Filters-only therapist search over `active` therapists.
 *
 * All provided filters are HARD filters AND-ed together:
 *  - `languages` / `specializations`: Postgres array-overlap (`&&`) — a
 *    therapist matches if they share at least one value with the filter.
 *  - `gender`: exact equality.
 *  - `migrationExperience`: exact equality.
 *
 * Results are ordered by `displayName` ascending and paginated via
 * limit/offset. A separate count query yields `total` for the pager.
 *
 * NO scoring / ranking — this is deliberate per the MVP scope.
 */
export async function findTherapists(
  filter: TherapistFilter,
): Promise<FindTherapistsResult> {
  const db = getDb();
  const { languages, specializations, gender, migrationExperience, sort, page, pageSize } =
    filter;

  const conditions: SQL[] = [eq(therapists.status, "active")];

  if (languages && languages.length > 0) {
    // array-overlap: therapists.languages && ARRAY[...]
    conditions.push(
      sql`${therapists.languages} && ${sql.param(languages)}::text[]`,
    );
  }

  if (specializations && specializations.length > 0) {
    conditions.push(
      sql`${therapists.specializations} && ${sql.param(specializations)}::text[]`,
    );
  }

  if (gender) {
    conditions.push(eq(therapists.gender, gender));
  }

  if (migrationExperience !== undefined) {
    conditions.push(eq(therapists.migrationExperience, migrationExperience));
  }

  const whereClause = and(...conditions);
  const offset = (page - 1) * pageSize;

  // Ordering is a plain user-chosen sort, NOT a relevance score.
  const orderBy =
    sort === "experience"
      ? [desc(therapists.yearsOfExperience), asc(therapists.displayName)]
      : sort === "recent"
        ? [desc(therapists.createdAt)]
        : [asc(therapists.displayName)];

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: therapists.id,
        slug: therapists.slug,
        displayName: therapists.displayName,
        photoUrl: therapists.photoUrl,
        bio: therapists.bio,
        yearsOfExperience: therapists.yearsOfExperience,
        languages: therapists.languages,
        specializations: therapists.specializations,
        gender: therapists.gender,
        verified: therapists.verified,
      })
      .from(therapists)
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(therapists)
      .where(whereClause),
  ]);

  const items: TherapistSummary[] = rows.map((row) => ({
    ...row,
    bio: truncateBio(row.bio),
  }));

  return {
    items,
    total: countRows[0]?.count ?? 0,
    page,
    pageSize,
  };
}
