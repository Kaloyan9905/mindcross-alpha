import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env/server";
import * as schema from "./schema";

type Schema = typeof schema;

/**
 * Cache the pool/client on `globalThis` so warm serverless invocations (Vercel)
 * reuse one pool instead of opening a fresh set of connections each time, which
 * would quickly exhaust the database.
 */
const globalForDb = globalThis as unknown as {
  _mcPool?: Pool;
  _mcDb?: NodePgDatabase<Schema>;
};

/** Managed Postgres (Neon, Supabase, …) requires TLS; local Docker does not. */
function needsSsl(url: string): boolean {
  return !/(localhost|127\.0\.0\.1)/.test(url);
}

/**
 * Lazy singleton Postgres pool. Created on first call (never during build), and
 * cached across invocations. TLS is enabled automatically for non-local hosts.
 */
export function getPool(): Pool {
  if (!globalForDb._mcPool) {
    const url = env().DATABASE_URL;
    globalForDb._mcPool = new Pool({
      connectionString: url,
      max: 10,
      ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return globalForDb._mcPool;
}

/** Lazy Drizzle client over the singleton pool. */
export function getDb(): NodePgDatabase<Schema> {
  if (!globalForDb._mcDb) {
    globalForDb._mcDb = drizzle(getPool(), { schema });
  }
  return globalForDb._mcDb;
}
