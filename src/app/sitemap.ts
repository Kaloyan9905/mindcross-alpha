import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { listActiveTherapistSlugs } from "@/modules/therapists";

// Re-generate at most hourly; therapist profiles change rarely.
export const revalidate = 3600;

/** Public marketing/auth routes worth indexing. */
const STATIC_PATHS: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/our-mission", priority: 0.7 },
  { path: "/find-a-therapist", priority: 0.9 },
  { path: "/join-as-therapist", priority: 0.6 },
  { path: "/contact", priority: 0.4 },
  { path: "/privacy", priority: 0.3 },
  { path: "/disclaimer", priority: 0.3 },
  { path: "/login", priority: 0.2 },
  { path: "/register", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: r.priority,
  }));

  let therapistEntries: MetadataRoute.Sitemap = [];
  try {
    const slugs = await listActiveTherapistSlugs();
    therapistEntries = slugs.map((t) => ({
      url: `${SITE_URL}/therapists/${t.slug}`,
      lastModified: t.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch {
    // No DB at build time -> ship the static sitemap rather than fail the build.
    therapistEntries = [];
  }

  return [...staticEntries, ...therapistEntries];
}
