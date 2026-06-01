import { and, asc, eq, gt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  type AvailabilitySlot,
  type TherapistGender,
  availabilitySlots,
  therapists,
} from "@/modules/therapists/db/schema";

/**
 * Full public therapist profile for the detail page, plus the therapist's
 * upcoming bookable slots.
 *
 * Internal-only columns (`userId`, raw `status`, timestamps) are NOT exposed.
 * `email` / `phone` / `sessionUrl` are intentionally omitted from the public
 * projection — a client only sees the meeting link once a booking is created
 * (the booking module snapshots `sessionUrl` server-side).
 */
export type TherapistDetail = {
  id: string;
  slug: string;
  displayName: string;
  bio: string;
  yearsOfExperience: number;
  languages: string[];
  culturalBackground: string[];
  specializations: string[];
  migrationExperience: boolean;
  gender: TherapistGender | null;
  verified: boolean;
  pricePerSessionCents: number | null;
  currency: string;
  photoUrl: string | null;
  /** Future, unbooked availability slots ordered by start time. */
  slots: AvailabilitySlot[];
};

/** Cap on slots returned for a single profile view. */
const MAX_SLOTS = 100;

/**
 * Look up an `active` therapist by slug and attach their upcoming, unbooked
 * availability slots (future `startsAt`, `isBooked = false`, ascending).
 *
 * Returns `null` when no therapist matches the slug OR the therapist is not
 * `active` (draft / pending_review / paused / disabled profiles are never
 * publicly resolvable by slug).
 */
export async function getTherapistBySlug(
  slug: string,
): Promise<TherapistDetail | null> {
  const db = getDb();

  const rows = await db
    .select({
      id: therapists.id,
      slug: therapists.slug,
      displayName: therapists.displayName,
      bio: therapists.bio,
      yearsOfExperience: therapists.yearsOfExperience,
      languages: therapists.languages,
      culturalBackground: therapists.culturalBackground,
      specializations: therapists.specializations,
      migrationExperience: therapists.migrationExperience,
      gender: therapists.gender,
      verified: therapists.verified,
      pricePerSessionCents: therapists.pricePerSessionCents,
      currency: therapists.currency,
      photoUrl: therapists.photoUrl,
    })
    .from(therapists)
    .where(and(eq(therapists.slug, slug), eq(therapists.status, "active")))
    .limit(1);

  const profile = rows[0];
  if (!profile) return null;

  const slots = await db
    .select()
    .from(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.therapistId, profile.id),
        eq(availabilitySlots.isBooked, false),
        gt(availabilitySlots.startsAt, new Date()),
      ),
    )
    .orderBy(asc(availabilitySlots.startsAt))
    .limit(MAX_SLOTS);

  return { ...profile, slots };
}
