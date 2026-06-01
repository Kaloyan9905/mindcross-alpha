"use server";

import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { hashPassword } from "@/modules/identity/lib/password";
import { CONSENT_POLICY_VERSION } from "@/modules/identity/lib/consent";
import {
  registerSchema,
  type RegisterInput,
} from "@/modules/identity/lib/validators";

/**
 * Result of {@link registerAction}. Discriminated on `ok` so the caller can
 * branch without try/catch — expected errors (validation, duplicate email)
 * are never thrown to the client.
 */
export type RegisterResult = { ok: true } | { ok: false; error: string };

/**
 * Register a new client account.
 *
 * Steps: validate input, reject a duplicate email, hash the password, then
 * insert a `users` row with role `client`.
 *
 * MVP: email verification skipped — `emailVerified` is set to the current
 * time at insert so the account is immediately usable. When the real
 * verification flow lands, set `emailVerified` to NULL here and send a
 * verification email instead.
 */
export async function registerAction(
  input: RegisterInput,
): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid registration details";
    return { ok: false, error: first };
  }

  const { name, email, password } = parsed.data;

  try {
    const db = getDb();

    // `users.email` is citext, so this duplicate check is case-insensitive.
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return { ok: false, error: "An account with that email already exists" };
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();

    await db.insert(users).values({
      id: uuidv7(),
      name,
      email,
      passwordHash,
      role: "client",
      securityStamp: uuidv7(),
      // MVP: email verification skipped — mark verified immediately.
      emailVerified: now,
      // GDPR: persist the consent the user just gave. `registerSchema` requires
      // `consent === true`, so reaching this insert means consent was given —
      // record when, and to which policy version.
      consentAcceptedAt: now,
      consentPolicyVersion: CONSENT_POLICY_VERSION,
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true };
  } catch (err) {
    console.error("registerAction failed:", err);
    return {
      ok: false,
      error: "Something went wrong creating your account. Please try again.",
    };
  }
}
