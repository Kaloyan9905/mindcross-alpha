import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users, type UserRole } from "@/modules/identity/db/schema";

/**
 * A user row for the admin Users page — a compact projection. `consentAcceptedAt`
 * is surfaced so staff can see the GDPR consent record at a glance.
 */
export interface UserAdminRow {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  consentAcceptedAt: Date | null;
  createdAt: Date;
}

/** Defensive cap for the admin list view. */
const MAX_ADMIN_USERS = 500;

/**
 * List all user accounts for the admin dashboard, newest first.
 */
export async function listUsersAdmin(): Promise<UserAdminRow[]> {
  const db = getDb();

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      consentAcceptedAt: users.consentAcceptedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(MAX_ADMIN_USERS);
}
