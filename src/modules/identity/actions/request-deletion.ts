"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { auth } from "@/modules/identity/lib/auth";

/**
 * Result of {@link requestDeletionAction}. Discriminated on `ok`.
 */
export type RequestDeletionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Record a GDPR "right to erasure" (Article 17) request for the currently
 * authenticated user.
 *
 * MVP behaviour: this does NOT delete any data. Account deletion at MVP is a
 * manual admin task — there is no automated erasure pipeline yet. This action
 * only *logs the request* so the team can act on it:
 *   1. `console.log` an audit line, and
 *   2. write a JSON file under `dev-emails/` (the shared dev inbox the team
 *      watches for mock notifications).
 *
 * When the real deletion flow is built, replace the body here with the
 * cascading delete + confirmation email — the signature can stay the same.
 */
export async function requestDeletionAction(): Promise<RequestDeletionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ok: false, error: "You must be signed in to request deletion" };
  }

  const requestedAt = new Date();
  const record = {
    type: "gdpr_deletion_request" as const,
    userId: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    requestedAt: requestedAt.toISOString(),
    note: "MVP: deletion is a manual admin task — no data has been removed.",
  };

  // Audit trail to the server log.
  console.log("[GDPR] Account deletion requested:", record);

  try {
    const dir = join(process.cwd(), "dev-emails");
    await mkdir(dir, { recursive: true });

    const stamp = requestedAt.toISOString().replace(/[:.]/g, "-");
    const safeEmail = (session.user.email ?? "unknown").replace(
      /[^a-z0-9._-]/gi,
      "_",
    );
    const file = join(dir, `${stamp}-${safeEmail}-deletion-request.json`);

    await writeFile(file, JSON.stringify(record, null, 2), "utf8");
    return { ok: true };
  } catch (err) {
    console.error("requestDeletionAction failed to write request file:", err);
    return {
      ok: false,
      error: "Could not record your deletion request. Please contact support.",
    };
  }
}
