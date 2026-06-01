import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  type TherapistStatus,
  therapists,
} from "@/modules/therapists/db/schema";

/** Compact therapist row for the admin management table. */
export type TherapistAdminRow = {
  id: string;
  slug: string;
  displayName: string;
  email: string;
  status: TherapistStatus;
  verified: boolean;
  /** True when a login account is linked to this therapist profile. */
  hasLogin: boolean;
  createdAt: Date;
};

/** Cap on therapists returned to the admin management table. */
const MAX_THERAPISTS = 500;

/**
 * List ALL therapists regardless of status (draft / pending_review / active /
 * paused / disabled), newest first. For the admin module's "manage therapists"
 * table — gated by admin auth in the admin module.
 *
 * Returns a compact projection (no bio / pricing / availability); the admin
 * detail screen fetches the full record separately.
 */
export async function listTherapistsAdmin(): Promise<TherapistAdminRow[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: therapists.id,
      slug: therapists.slug,
      displayName: therapists.displayName,
      email: therapists.email,
      status: therapists.status,
      verified: therapists.verified,
      userId: therapists.userId,
      createdAt: therapists.createdAt,
    })
    .from(therapists)
    .orderBy(desc(therapists.createdAt))
    .limit(MAX_THERAPISTS);

  return rows.map(({ userId, ...r }) => ({ ...r, hasLogin: userId !== null }));
}
