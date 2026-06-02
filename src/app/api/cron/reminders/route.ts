import { NextResponse } from "next/server";
import { env } from "@/lib/env/server";
import { sendDueReminders, runSessionMaintenance } from "@/modules/booking";

// The reminder scan opens a DB pool + sends email — needs the Node runtime,
// not the Edge runtime.
export const runtime = "nodejs";
// Never cache or statically optimize a job endpoint.
export const dynamic = "force-dynamic";

/**
 * Cron-triggered 24h reminder job.
 *
 * Wire a free scheduler to hit this every 15-60 minutes — a Cloudflare Cron
 * Trigger (`[triggers] crons = ["*\/30 * * * *"]` in wrangler.toml), a GitHub
 * Actions schedule, or any cron service. Because the scan is idempotent, a
 * missed run simply catches up on the next tick.
 *
 * AUTH: guarded by the `CRON_SECRET` shared secret presented as
 * `Authorization: Bearer <CRON_SECRET>`.
 *  - If `CRON_SECRET` is set, the header must match.
 *  - In production, a missing `CRON_SECRET` is a hard 500 (refuse to run an
 *    unauthenticated job in prod) rather than silently open.
 *  - In dev/test with no secret configured, the endpoint is open for local
 *    testing.
 */
function authorize(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const { CRON_SECRET, NODE_ENV } = env();

  if (!CRON_SECRET) {
    if (NODE_ENV === "production") {
      return {
        ok: false,
        status: 500,
        error: "CRON_SECRET is not configured; refusing to run the job in production.",
      };
    }
    // Dev/test convenience: allow unauthenticated local runs.
    return { ok: true };
  }

  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${CRON_SECRET}`;
  // Length check first so the constant-time-ish compare below is meaningful.
  if (header.length !== expected.length || header !== expected) {
    return { ok: false, status: 401, error: "Unauthorized." };
  }
  return { ok: true };
}

async function runJob(req: Request): Promise<NextResponse> {
  const auth = authorize(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    // One trigger runs all scheduled session jobs: 24h/1h reminders, no-show
    // expiry (past the grace period), and recycle-bin purge.
    const reminders = await sendDueReminders();
    const maintenance = await runSessionMaintenance();
    return NextResponse.json({ ok: true, reminders, maintenance });
  } catch (err) {
    console.error("[cron/reminders] job failed:", err);
    return NextResponse.json(
      { ok: false, error: "Session job failed." },
      { status: 500 },
    );
  }
}

// POST is the canonical trigger; GET is accepted too so simple cron services
// that only issue GETs (still carrying the bearer header) work as well.
export async function POST(req: Request): Promise<NextResponse> {
  return runJob(req);
}

export async function GET(req: Request): Promise<NextResponse> {
  return runJob(req);
}
