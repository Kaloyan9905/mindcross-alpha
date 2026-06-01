/**
 * Env preloader for standalone tsx scripts. Import this FIRST (before any
 * `@/...` app module) so DATABASE_URL / AUTH_SECRET from `.env.local` land in
 * process.env before the lazy `getDb()` / env() helpers read them.
 *
 *   import "./_env";
 *   import { getDb } from "@/lib/db";
 */
import path from "node:path";
import { config } from "dotenv";

// `.env.local` is the canonical local-dev file (Docker Postgres + AUTH_SECRET);
// fall back to `.env` if present. dotenv never overrides already-set vars, so
// loading local first lets it win.
config({ path: path.resolve(process.cwd(), ".env.local") });
config();
