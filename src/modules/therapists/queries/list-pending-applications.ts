import { desc, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  type TherapistApplication,
  therapistApplications,
} from "@/modules/therapists/db/schema";

/** Cap on applications returned to the admin review queue. */
const MAX_APPLICATIONS = 200;

/**
 * List therapist applications awaiting review — both `pending` (untouched) and
 * `info_requested` (parked while ops waits on the applicant). Newest submission
 * first. Consumed by the admin module's application-review screen.
 *
 * The full application row is returned (no PII filtering): this query is only
 * ever called behind an admin auth check in the admin module.
 */
export async function listPendingApplications(): Promise<
  TherapistApplication[]
> {
  const db = getDb();

  return db
    .select()
    .from(therapistApplications)
    .where(
      inArray(therapistApplications.status, ["pending", "info_requested"]),
    )
    .orderBy(desc(therapistApplications.submittedAt))
    .limit(MAX_APPLICATIONS);
}
