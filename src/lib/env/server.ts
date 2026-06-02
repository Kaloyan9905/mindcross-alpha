import { z } from "zod";

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // Auth.js v5: secret used to sign/encrypt tokens and cookies.
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  // Auth.js v5: trust the host header (set to "true" for local + Vercel).
  AUTH_TRUST_HOST: z.string().optional(),
  // Shared secret guarding the cron-triggered job endpoints (e.g. the 24h
  // reminder scan at /api/cron/reminders). Optional in development; when set,
  // requests must present it as `Authorization: Bearer <CRON_SECRET>`. The
  // endpoint refuses to run in production unless this is configured.
  CRON_SECRET: z.string().optional(),
  // Optional TURN relay for the in-app meeting engine. STUN (free, no account)
  // handles most calls; set these to close the NAT gap for users behind
  // symmetric NAT / restrictive firewalls (e.g. a self-hosted coturn). When
  // unset, the room runs STUN-only. Read by `@/modules/meeting/lib/ice`.
  // Cloudflare TURN (managed, free) — the app mints short-lived ICE servers
  // from these per join. Highest-priority TURN source when set.
  CLOUDFLARE_TURN_KEY_ID: z.string().optional(),
  CLOUDFLARE_TURN_API_TOKEN: z.string().optional(),
  // Self-hosted relay alternative. Preferred: a coturn `use-auth-secret` value —
  // the app mints short-lived HMAC credentials from it (no per-user TURN
  // account). Falls back to the static username/credential pair below if unset.
  MEETING_TURN_URL: z.string().optional(),
  MEETING_TURN_SECRET: z.string().optional(),
  MEETING_TURN_USERNAME: z.string().optional(),
  MEETING_TURN_CREDENTIAL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cached: ServerEnv | null = null;

/**
 * Lazy-validated server env. Only validates on first call, so importing this
 * module at build time (e.g. during `next build`'s page-data collection) does
 * not trigger validation. Real validation happens at runtime on first request.
 */
export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  cached = parsed.data;
  return cached;
}
