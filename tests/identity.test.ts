/**
 * Integration tests for the identity module.
 *
 * These exercise the real module API against the live seeded Postgres
 * database (DATABASE_URL from .env.local). `registerAction` mutates the
 * `users` table — every test uses a unique email and cleans itself up.
 */
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
// Import directly from the module's source files. The `@/modules/identity`
// barrel also re-exports `auth` (Auth.js), which transitively imports
// `next-auth` -> `next/server` in a form Vitest's resolver cannot load. These
// are the SAME real functions/tables the public API re-exports — no mocking.
import { registerAction } from "@/modules/identity/actions/register";
import { users } from "@/modules/identity/db/schema";
import { hashPassword, verifyPassword } from "@/modules/identity/lib/password";

// A valid password is >= 12 chars (registerSchema PASSWORD_MIN).
const VALID_PASSWORD = "correct-horse-battery-staple";

// Track emails we insert so we can purge them after the suite.
const createdEmails: string[] = [];

afterAll(async () => {
  if (createdEmails.length === 0) return;
  try {
    const db = getDb();
    for (const email of createdEmails) {
      await db.delete(users).where(eq(users.email, email));
    }
  } catch (err) {
    // Best-effort cleanup — never fail the suite over a cleanup hiccup.
    console.warn("[identity.test] cleanup failed:", err);
  }
});

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword(VALID_PASSWORD);
    expect(hash).toBeTypeOf("string");
    expect(hash.length).toBeGreaterThan(0);
    // Hash must not equal the plaintext.
    expect(hash).not.toBe(VALID_PASSWORD);

    await expect(verifyPassword(hash, VALID_PASSWORD)).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong-password-here")).resolves.toBe(
      false,
    );
  });
});

describe("registerAction", () => {
  it("registers a brand-new email and inserts a client user row", async () => {
    const email = `test-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}@example.com`;
    createdEmails.push(email);

    const result = await registerAction({
      name: "Test User",
      email,
      password: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
      consent: true,
    });

    expect(result.ok).toBe(true);

    const db = getDb();
    const rows = await db
      .select({ id: users.id, role: users.role, email: users.email })
      .from(users)
      .where(eq(users.email, email));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.role).toBe("client");
  });

  it("rejects registration when the email already exists", async () => {
    const email = `test-dup-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}@example.com`;
    createdEmails.push(email);

    const first = await registerAction({
      name: "First User",
      email,
      password: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
      consent: true,
    });
    expect(first.ok).toBe(true);

    const second = await registerAction({
      name: "Second User",
      email,
      password: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
      consent: true,
    });
    expect(second.ok).toBe(false);
  });

  it("rejects a too-short password at the validation boundary", async () => {
    const email = `test-short-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}@example.com`;

    const result = await registerAction({
      name: "Short Pw User",
      email,
      // 7 chars — below the 12-char minimum.
      password: "short77",
      confirmPassword: "short77",
      consent: true,
    });

    expect(result.ok).toBe(false);

    // The invalid registration must not have written a row.
    const db = getDb();
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    expect(rows).toHaveLength(0);
  });
});
