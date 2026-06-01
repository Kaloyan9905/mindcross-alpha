"use server";

import { auth } from "@/modules/identity/lib/auth";
import { sendEmail } from "@/modules/notifications";

/**
 * Where account-deletion requests are routed. Ops monitors this inbox and
 * executes the erasure from the admin Users page (or the database).
 */
const OPS_EMAIL = "privacy@mindcross.local";

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
 * MVP flow (per the MVP plan's "manual deletion flow"): the user requests
 * erasure here; this notifies ops, who then erase the account from the admin
 * Users page (`/admin/users` → `deleteUserAction`). We do not auto-delete on
 * self-service to keep an irreversible action behind a human step.
 *
 * The (mock) notification is best-effort — see `sendEmail`.
 */
export async function requestDeletionAction(): Promise<RequestDeletionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ok: false, error: "You must be signed in to request deletion" };
  }

  const requestedAt = new Date();
  const userId = session.user.id;
  const userEmail = session.user.email ?? "unknown";
  const userName = session.user.name ?? "(no name)";

  console.log("[GDPR] Account deletion requested:", {
    userId,
    email: userEmail,
    requestedAt: requestedAt.toISOString(),
  });

  try {
    // Notify ops so they can process the erasure. `sendEmail` is the mock
    // transport at MVP (writes to dev-emails/ + logs); it never throws.
    await sendEmail({
      to: OPS_EMAIL,
      subject: `Account deletion request — ${userEmail}`,
      text: `A user has requested deletion of their MindCross account (GDPR Article 17).

User: ${userName}
Email: ${userEmail}
User ID: ${userId}
Requested at: ${requestedAt.toISOString()}

Process this from /admin/users (Delete) once verified.`,
      html: `<p>A user has requested deletion of their MindCross account (GDPR Article 17).</p>
<ul>
  <li><strong>User:</strong> ${userName}</li>
  <li><strong>Email:</strong> ${userEmail}</li>
  <li><strong>User ID:</strong> ${userId}</li>
  <li><strong>Requested at:</strong> ${requestedAt.toISOString()}</li>
</ul>
<p>Process this from <code>/admin/users</code> (Delete) once verified.</p>`,
    });

    return { ok: true };
  } catch (err) {
    console.error("requestDeletionAction failed to notify ops:", err);
    return {
      ok: false,
      error: "Could not record your deletion request. Please contact support.",
    };
  }
}
