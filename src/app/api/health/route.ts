import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Check = { ok: boolean; latencyMs?: number; error?: string };

export async function GET() {
  const startedAt = Date.now();
  const checks: Record<string, Check> = {
    app: { ok: true },
  };

  try {
    const pool = getPool();
    const t0 = Date.now();
    const result = await pool.query<{ ok: number }>("SELECT 1 AS ok");
    checks.database = {
      ok: result.rows[0]?.ok === 1,
      latencyMs: Date.now() - t0,
    };
  } catch (err) {
    checks.database = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const ok = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeMs: Math.round(process.uptime() * 1000),
      checks,
      durationMs: Date.now() - startedAt,
    },
    { status: ok ? 200 : 503 },
  );
}
