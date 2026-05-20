/**
 * Dev utility: create (or promote) an admin user.
 *
 *   npx tsx scripts/create-admin.ts [email] [password]
 *
 * Defaults: admin@mindcross.local / Admin12345!
 *
 * Registration through the app only ever creates `client` users, so this is
 * the supported way to obtain an account that can reach the /admin panel.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDb } from "@/lib/db";
import { users } from "@/modules/identity/db/schema";
import { hashPassword } from "@/modules/identity/lib/password";

async function main() {
  const email = process.argv[2] ?? "admin@mindcross.local";
  const password = process.argv[3] ?? "Admin12345!";
  const role = "admin_super" as const;

  const db = getDb();
  const passwordHash = await hashPassword(password);
  const now = new Date();

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({
        role,
        passwordHash,
        securityStamp: uuidv7(),
        emailVerified: now,
        updatedAt: now,
      })
      .where(eq(users.id, existing.id));
    console.log(`Promoted existing user to ${role}.`);
  } else {
    await db.insert(users).values({
      id: uuidv7(),
      name: "MindCross Admin",
      email,
      emailVerified: now,
      passwordHash,
      role,
      securityStamp: uuidv7(),
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created admin user.`);
  }

  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  console.log(`  role:     ${role}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("create-admin failed:", err);
  process.exit(1);
});
