"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
// Import TABLE refs from their schema sources (not the module barrels): the
// barrels re-export session-bound actions, and pulling those into the admin
// module would create an import cycle. Schema files have no such deps.
import { users } from "@/modules/identity/db/schema";
import { availabilitySlots } from "@/modules/therapists/db/schema";
import { bookings } from "@/modules/booking/db/schema";
import { isAdminRole } from "../lib/policies";
import { getAdminUser } from "../lib/policies";

/** Discriminated result for the GDPR account-erasure action. */
export type DeleteUserResult = { ok: true } | { ok: false; error: string };

const deleteUserSchema = z.object({
  userId: z.string().min(1, "A user is required."),
});

export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

/**
 * Admin Server Action: erase a user account (GDPR Article 17, "right to
 * erasure"). Self-authorizing via `getAdminUser()`.
 *
 * Guardrails:
 *  - Refuses to delete staff (`admin_*`) accounts — staff lifecycle is managed
 *    directly in the database to avoid accidental console lockout.
 *  - Refuses self-deletion.
 *
 * Erasure: inside one transaction we first free the availability slots held by
 * the user's confirmed future bookings (so a deleted user does not leave a slot
 * stuck as booked), then delete the `users` row. The schema's `ON DELETE
 * CASCADE` foreign keys then remove the user's bookings, sessions, and OAuth
 * accounts.
 */
export async function deleteUserAction(
  input: DeleteUserInput,
): Promise<DeleteUserResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { ok: false, error: "You are not authorized to delete accounts." };
  }

  const parsed = deleteUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  const { userId } = parsed.data;

  if (userId === admin.id) {
    return { ok: false, error: "You cannot delete your own account from here." };
  }

  try {
    const db = getDb();

    const [target] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!target) {
      return { ok: false, error: "User not found." };
    }
    if (isAdminRole(target.role)) {
      return {
        ok: false,
        error: "Staff accounts cannot be deleted here. Manage them in the database.",
      };
    }

    await db.transaction(async (tx) => {
      // Free the slots of the user's confirmed (still-active) bookings so they
      // re-open for others. Cancelled bookings already freed their slots.
      const activeBookings = await tx
        .select({ slotId: bookings.slotId })
        .from(bookings)
        .where(
          and(
            eq(bookings.clientId, userId),
            eq(bookings.status, "confirmed"),
            isNotNull(bookings.slotId),
          ),
        );

      for (const b of activeBookings) {
        if (b.slotId) {
          await tx
            .update(availabilitySlots)
            .set({ isBooked: false })
            .where(eq(availabilitySlots.id, b.slotId));
        }
      }

      // Deleting the user cascades to bookings, sessions, and accounts.
      await tx.delete(users).where(eq(users.id, userId));
    });

    return { ok: true };
  } catch (err) {
    console.error("deleteUserAction failed:", err);
    return { ok: false, error: "Could not delete the account. Please try again." };
  }
}
