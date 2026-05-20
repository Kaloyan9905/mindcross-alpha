import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * The shape of a single outbound email. This is intentionally the signature
 * a real provider (Resend / SES) would accept, so the implementation can be
 * swapped without touching callers.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Directory (at the project root) where mock emails are written so the team
 * can inspect what *would* have been sent. Git-ignored — see .gitignore.
 */
const DEV_EMAILS_DIR = path.join(process.cwd(), "dev-emails");

/**
 * Build a filesystem-safe slug from an email address for use in filenames.
 */
function slugifyRecipient(to: string): string {
  return to.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * Send an email.
 *
 * MVP mock — swap for a real provider (Resend/SES) post-MVP. No external
 * account needed for local dev. At MVP this:
 *   1. logs a one-line summary to the console, and
 *   2. writes the full message as a timestamped JSON file into `dev-emails/`.
 *
 * Resilient by design: a filesystem failure is logged but never thrown, so a
 * booking flow is never broken by the (mock) notification layer.
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  // 1. One-line summary to the console.
  console.log(`[email] to=${msg.to} subject=${msg.subject}`);

  // 2. Persist the full message for inspection. Never throw on failure.
  try {
    await mkdir(DEV_EMAILS_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${timestamp}-${slugifyRecipient(msg.to)}.json`;
    const filePath = path.join(DEV_EMAILS_DIR, fileName);

    const payload = {
      sentAt: new Date().toISOString(),
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    };

    await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  } catch (err) {
    // A mock-email write failure must not surface to the caller.
    console.error("[email] failed to write dev-emails file (ignored):", err);
  }
}
