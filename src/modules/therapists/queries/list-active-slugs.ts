import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { therapists } from "@/modules/therapists/db/schema";

export interface TherapistSlugRow {
  slug: string;
  updatedAt: Date;
}

/**
 * Slugs of all ACTIVE (publicly visible) therapists, for the sitemap. Returns
 * the slug + last-updated time so crawlers see accurate `lastModified` values.
 */
export async function listActiveTherapistSlugs(): Promise<TherapistSlugRow[]> {
  const db = getDb();
  return db
    .select({ slug: therapists.slug, updatedAt: therapists.updatedAt })
    .from(therapists)
    .where(eq(therapists.status, "active"));
}
