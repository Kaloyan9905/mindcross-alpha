import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  // DDL prefers a DIRECT (unpooled) connection. Neon's Vercel integration sets
  // DATABASE_URL_UNPOOLED; fall back to DATABASE_URL otherwise.
  const url =
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.MIGRATE_DATABASE_URL ??
    process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const isLocal = /(localhost|127\.0\.0\.1)/.test(url);
  const pool = new Pool({
    connectionString: url,
    max: 1,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete.");

  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
