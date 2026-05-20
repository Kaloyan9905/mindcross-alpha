import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { therapists } from "@/modules/therapists/db/schema";

/**
 * Convert an arbitrary display name into a URL-safe slug fragment:
 * lowercase, non-alphanumerics collapsed to single hyphens, no leading or
 * trailing hyphens. Diacritics are stripped so "Renée Müller" -> "renee-muller".
 */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    // strip combining diacritical marks
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    // anything that is not a-z or 0-9 becomes a separator
    .replace(/[^a-z0-9]+/g, "-")
    // trim leading/trailing hyphens
    .replace(/^-+|-+$/g, "");
}

/**
 * Given a base slug, return a slug guaranteed not to collide with an existing
 * `therapists.slug`. If `base` is free it is returned as-is; otherwise `-2`,
 * `-3`, ... is appended until a free value is found.
 *
 * If `base` slugifies to an empty string (e.g. a name with no latin chars) we
 * fall back to "therapist" so the loop still has something to work with.
 */
export async function uniqueSlug(base: string): Promise<string> {
  const db = getDb();
  const root = slugify(base) || "therapist";

  let candidate = root;
  let suffix = 1;

  // Bounded loop: in practice resolves in 1-2 iterations.
  while (suffix < 1000) {
    const existing = await db
      .select({ id: therapists.id })
      .from(therapists)
      .where(eq(therapists.slug, candidate))
      .limit(1);

    if (existing.length === 0) {
      return candidate;
    }

    suffix += 1;
    candidate = `${root}-${suffix}`;
  }

  // Extremely unlikely fallback: append a timestamp to guarantee uniqueness.
  return `${root}-${Date.now()}`;
}
