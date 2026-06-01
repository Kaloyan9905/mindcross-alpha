"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getTherapistForCurrentUser } from "../queries/get-therapist-for-user";
import {
  THERAPIST_GENDERS,
  type TherapistGender,
  therapists,
} from "../db/schema";

/** Discriminated result for the therapist profile-update action. */
export type UpdateTherapistProfileResult =
  | { ok: true }
  | { ok: false; error: string };

/** Optional URL: empty/null -> null; otherwise must look like an http(s) URL. */
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || /^https?:\/\//i.test(v), {
    message: "Please enter a valid URL (starting with http:// or https://).",
  });

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, "A display name is required.").max(100),
  bio: z.string().trim().min(20, "Please write at least a short bio.").max(2000),
  yearsOfExperience: z.coerce.number().int().min(0).max(70),
  languages: z.array(z.string().trim().min(1)).max(25),
  specializations: z.array(z.string().trim().min(1)).max(25),
  culturalBackground: z.array(z.string().trim().min(1)).max(25),
  gender: z.enum(THERAPIST_GENDERS).nullish().transform((v) => v ?? null),
  migrationExperience: z.boolean(),
  phone: z.string().trim().max(50).nullish().transform((v) => (v && v.length ? v : null)),
  sessionUrl: optionalUrl,
  photoUrl: optionalUrl,
});

/** Explicit input shape (the client form supplies arrays + cleared fields). */
export interface UpdateTherapistProfileInput {
  displayName: string;
  bio: string;
  yearsOfExperience: number;
  languages: string[];
  specializations: string[];
  culturalBackground: string[];
  gender?: TherapistGender | null;
  migrationExperience: boolean;
  phone?: string | null;
  sessionUrl?: string | null;
  photoUrl?: string | null;
}

/**
 * Therapist Server Action: update the signed-in therapist's OWN profile.
 *
 * Self-authorizing: resolves the caller's therapist profile via
 * `getTherapistForCurrentUser()` and scopes the update to that row's id — a
 * therapist can only edit their own profile. `slug`, `status`, `verified`, and
 * `email` are intentionally NOT editable here (admin/ops own those).
 */
export async function updateTherapistProfileAction(
  input: UpdateTherapistProfileInput,
): Promise<UpdateTherapistProfileResult> {
  const me = await getTherapistForCurrentUser();
  if (!me) {
    return { ok: false, error: "You must be signed in as a therapist." };
  }

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid profile." };
  }
  const data = parsed.data;

  try {
    const db = getDb();
    await db
      .update(therapists)
      .set({
        displayName: data.displayName,
        bio: data.bio,
        yearsOfExperience: data.yearsOfExperience,
        languages: data.languages,
        specializations: data.specializations,
        culturalBackground: data.culturalBackground,
        gender: data.gender ?? null,
        migrationExperience: data.migrationExperience,
        phone: data.phone,
        sessionUrl: data.sessionUrl,
        photoUrl: data.photoUrl,
        updatedAt: new Date(),
      })
      .where(eq(therapists.id, me.id));

    return { ok: true };
  } catch (err) {
    console.error("updateTherapistProfileAction failed:", err);
    return { ok: false, error: "Could not save your profile. Please try again." };
  }
}
