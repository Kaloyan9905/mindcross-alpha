"use server";

import { z } from "zod";
import { uuidv7 } from "uuidv7";
import { getDb } from "@/lib/db";
import { therapistApplications } from "@/modules/therapists/db/schema";

/**
 * Input schema for the public "join as therapist" careers form. Validated at
 * the action boundary — the DB layer is not the first line of defense.
 */
const submitApplicationSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(200),
  email: z.string().trim().toLowerCase().email("A valid email is required").max(320),
  phone: z.string().trim().max(40).optional(),
  country: z.string().trim().max(120).optional(),
  languages: z
    .array(z.string().trim().min(1))
    .min(1, "Select at least one language")
    .max(20),
  specializations: z
    .array(z.string().trim().min(1))
    .min(1, "Select at least one specialization")
    .max(20),
  yearsOfExperience: z.coerce.number().int().min(0).max(70),
  shortBio: z
    .string()
    .trim()
    .min(20, "Please write a short bio (at least 20 characters)")
    .max(2000),
});

/** Parsed careers-form input. */
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;

/** Discriminated result for the careers form. */
export type SubmitApplicationResult =
  | { ok: true; applicationId: string }
  | { ok: false; error: string };

/**
 * Public Server Action behind the careers / "join as therapist" page.
 *
 * Validates the input, inserts a `therapist_applications` row with status
 * `pending`, and returns a discriminated result. Expected errors (validation,
 * DB failure) are returned, never thrown.
 */
export async function submitApplicationAction(
  input: unknown,
): Promise<SubmitApplicationResult> {
  const parsed = submitApplicationSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Invalid application details.",
    };
  }

  const data = parsed.data;

  try {
    const db = getDb();
    const id = uuidv7();

    await db.insert(therapistApplications).values({
      id,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone ?? null,
      country: data.country ?? null,
      languages: data.languages,
      specializations: data.specializations,
      yearsOfExperience: data.yearsOfExperience,
      shortBio: data.shortBio,
      status: "pending",
      submittedAt: new Date(),
    });

    return { ok: true, applicationId: id };
  } catch (err) {
    console.error("submitApplicationAction failed:", err);
    return {
      ok: false,
      error: "Could not submit your application. Please try again.",
    };
  }
}
