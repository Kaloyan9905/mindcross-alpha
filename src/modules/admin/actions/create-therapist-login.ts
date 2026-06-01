"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { hashPassword } from "@/modules/identity/lib/password";
import { therapists } from "@/modules/therapists/db/schema";
import { getAdminUser } from "../lib/policies";

export type CreateTherapistLoginResult =
  | { ok: true; email: string; tempPassword: string | null; note: string }
  | { ok: false; error: string };

const schema = z.object({ therapistId: z.string().min(1) });
export type CreateTherapistLoginInput = z.infer<typeof schema>;

/** A readable, sufficiently-strong temporary password (>= 12 chars). */
function generateTempPassword(): string {
  return randomBytes(12).toString("base64url");
}

/**
 * Admin Server Action: provision (or link) a login for a therapist profile so
 * they can use the therapist self-service area. Self-authorizing via
 * `getAdminUser()`.
 *
 *  - If a user already exists with the therapist's email, it is linked and
 *    promoted to the `therapist` role (password unchanged).
 *  - Otherwise a new `therapist` user is created with a generated temporary
 *    password, which is returned ONCE for the admin to hand to the therapist.
 */
export async function createTherapistLoginAction(
  input: CreateTherapistLoginInput,
): Promise<CreateTherapistLoginResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { ok: false, error: "You are not authorized to create logins." };
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    const db = getDb();
    const [therapist] = await db
      .select({ id: therapists.id, email: therapists.email, userId: therapists.userId })
      .from(therapists)
      .where(eq(therapists.id, parsed.data.therapistId))
      .limit(1);

    if (!therapist) return { ok: false, error: "Therapist not found." };
    if (therapist.userId) {
      return { ok: false, error: "This therapist already has a login." };
    }

    const now = new Date();

    // Reuse an existing account with this email if there is one.
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, therapist.email))
      .limit(1);

    if (existing) {
      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({ role: "therapist", updatedAt: now })
          .where(eq(users.id, existing.id));
        await tx
          .update(therapists)
          .set({ userId: existing.id, updatedAt: now })
          .where(eq(therapists.id, therapist.id));
      });
      return {
        ok: true,
        email: therapist.email,
        tempPassword: null,
        note: "Linked an existing account (password unchanged) and set its role to therapist.",
      };
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const userId = uuidv7();

    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        name: null,
        email: therapist.email,
        passwordHash,
        role: "therapist",
        securityStamp: uuidv7(),
        emailVerified: now,
        createdAt: now,
        updatedAt: now,
      });
      await tx
        .update(therapists)
        .set({ userId, updatedAt: now })
        .where(eq(therapists.id, therapist.id));
    });

    return {
      ok: true,
      email: therapist.email,
      tempPassword,
      note: "Created a therapist login. Share the temporary password securely; they should change it after first sign-in.",
    };
  } catch (err) {
    console.error("createTherapistLoginAction failed:", err);
    return { ok: false, error: "Could not create the login. Please try again." };
  }
}
