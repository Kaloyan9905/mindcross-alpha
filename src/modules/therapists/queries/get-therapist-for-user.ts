import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/modules/identity";
import { therapists, type Therapist } from "@/modules/therapists/db/schema";

/**
 * The therapist profile linked to `userId`, or null. The link
 * (`therapists.user_id`) is the source of truth for "is this user a therapist".
 * Internal helper for {@link getTherapistForCurrentUser}.
 */
async function getTherapistByUserId(
  userId: string,
): Promise<Therapist | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(therapists)
    .where(eq(therapists.userId, userId))
    .limit(1);
  return row ?? null;
}

/**
 * The therapist profile for the currently signed-in user, or null when the
 * request is anonymous or the user has no linked therapist profile. The
 * `(therapist)` layout uses this as its access gate; the therapist self-service
 * actions use it to authorize + scope writes to the caller's own profile.
 */
export async function getTherapistForCurrentUser(): Promise<Therapist | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return getTherapistByUserId(user.id);
}
