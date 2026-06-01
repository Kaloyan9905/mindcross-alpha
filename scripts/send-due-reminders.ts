/**
 * Manually run the 24h reminder scan against the configured database.
 *
 *   pnpm tsx scripts/send-due-reminders.ts      (or: pnpm reminders:run)
 *
 * In production a cron trigger hits POST /api/cron/reminders instead; this is
 * the same idempotent scan, runnable from the CLI for local testing or as a
 * fallback scheduler.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { sendDueReminders } from "../src/modules/booking/lib/send-due-reminders";

// Pick up `.env.local` (the file the app uses) without overriding real env.
loadEnv({ path: ".env.local" });

async function main() {
  const result = await sendDueReminders();
  console.log(
    `[reminders] scanned=${result.scanned} sent=${result.sent} failed=${result.failed}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("send-due-reminders failed:", err);
  process.exit(1);
});
