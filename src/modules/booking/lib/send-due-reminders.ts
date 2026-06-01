import { and, asc, eq, gt, isNull, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { therapists } from "@/modules/therapists/db/schema";
import { bookingReminder, sendEmail } from "@/modules/notifications";
import { bookings } from "../db/schema";

/**
 * Outcome of one reminder scan, summed across the 24h + 1h passes.
 */
export interface SendDueRemindersResult {
  scanned: number;
  sent: number;
  failed: number;
}

export interface SendDueRemindersOptions {
  /** "Now" — injectable so tests are deterministic. Defaults to `new Date()`. */
  now?: Date;
  /** Lead time for the main reminder. Default 24h. */
  windowHours?: number;
  /** Defensive cap on reminders per pass. Default 500. */
  limit?: number;
}

type ReminderKind = "24h" | "1h";
type Db = ReturnType<typeof getDb>;

/**
 * Run a single reminder pass for one `kind`, against its own idempotency column
 * and time window. Returns the per-pass counts.
 *
 * Windows are NON-OVERLAPPING so a booking is never reminded twice at once:
 *  - "24h": sessions starting in (now + 1h, now + windowHours]  -> reminder_sent_at
 *  - "1h" : sessions starting in (now,      now + 1h]           -> reminder_1h_sent_at
 */
async function runPass(
  db: Db,
  kind: ReminderKind,
  now: Date,
  lower: Date,
  upper: Date,
  limit: number,
): Promise<{ scanned: number; sent: number; failed: number }> {
  const column = kind === "24h" ? bookings.reminderSentAt : bookings.reminder1hSentAt;

  const candidates = await db
    .select({
      id: bookings.id,
      startsAt: bookings.startsAt,
      joinUrl: bookings.joinUrl,
      clientName: users.name,
      clientEmail: users.email,
      therapistName: therapists.displayName,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.clientId, users.id))
    .innerJoin(therapists, eq(bookings.therapistId, therapists.id))
    .where(
      and(
        eq(bookings.status, "confirmed"),
        isNull(column),
        gt(bookings.startsAt, lower),
        lte(bookings.startsAt, upper),
      ),
    )
    .orderBy(asc(bookings.startsAt))
    .limit(limit);

  let sent = 0;
  let failed = 0;

  for (const c of candidates) {
    // Atomic claim on this kind's column — only one scan flips NULL -> now().
    const claimed = await db
      .update(bookings)
      .set(
        kind === "24h"
          ? { reminderSentAt: now, updatedAt: now }
          : { reminder1hSentAt: now, updatedAt: now },
      )
      .where(and(eq(bookings.id, c.id), isNull(column)))
      .returning({ id: bookings.id });

    if (claimed.length === 0) continue;

    try {
      const email = bookingReminder({
        clientName: c.clientName ?? "",
        therapistName: c.therapistName,
        startsAt: c.startsAt,
        joinUrl: c.joinUrl ?? null,
        kind,
      });
      await sendEmail({ to: c.clientEmail, ...email });
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(`[reminders:${kind}] send failed for ${c.id}, reverting claim:`, err);
      try {
        await db
          .update(bookings)
          .set(
            kind === "24h"
              ? { reminderSentAt: null, updatedAt: new Date() }
              : { reminder1hSentAt: null, updatedAt: new Date() },
          )
          .where(eq(bookings.id, c.id));
      } catch (revertErr) {
        console.error(`[reminders:${kind}] revert failed for ${c.id}:`, revertErr);
      }
    }
  }

  return { scanned: candidates.length, sent, failed };
}

/**
 * Send pre-session reminder emails. Runs two idempotent, concurrency-safe
 * passes — a main reminder (~24h ahead) and an optional final reminder (~1h
 * ahead) — each tracked by its own column. This is the €0, schedule-agnostic
 * alternative to durable Inngest sleeps (Confluence 9.5 Pattern 3): a cron hits
 * `POST /api/cron/reminders` every 15-60 minutes. Cancelled bookings are
 * skipped by the `status = 'confirmed'` filter.
 */
export async function sendDueReminders(
  options: SendDueRemindersOptions = {},
): Promise<SendDueRemindersResult> {
  const now = options.now ?? new Date();
  const windowHours = options.windowHours ?? 24;
  const limit = options.limit ?? 500;
  const hour = 60 * 60 * 1000;

  const db = getDb();

  const main = await runPass(
    db,
    "24h",
    now,
    new Date(now.getTime() + hour), // lower bound: 1h ahead
    new Date(now.getTime() + windowHours * hour),
    limit,
  );
  const final = await runPass(
    db,
    "1h",
    now,
    now, // lower bound: now
    new Date(now.getTime() + hour),
    limit,
  );

  return {
    scanned: main.scanned + final.scanned,
    sent: main.sent + final.sent,
    failed: main.failed + final.failed,
  };
}
