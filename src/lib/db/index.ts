import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env/server";
import * as schema from "./schema";

type Schema = typeof schema;

let _pool: Pool | null = null;
let _db: NodePgDatabase<Schema> | null = null;

/**
 * Lazy singleton Postgres pool. Created on first call to avoid running env
 * validation or opening a connection during `next build`.
 */
export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: env().DATABASE_URL,
      max: 10,
    });
  }
  return _pool;
}

/**
 * Lazy Drizzle client over the singleton pool.
 */
export function getDb(): NodePgDatabase<Schema> {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}
