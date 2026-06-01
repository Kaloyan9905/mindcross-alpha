import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { CONVERSATION_KIND, conversations } from "../db/schema";
import {
  dmAllowed,
  resolveTherapistConversation,
  sortPair,
} from "./conversation-access";

export type GetOrCreateConversationResult =
  | { ok: true; conversationId: string }
  | { ok: false; error: string };

const schema = z.object({
  userId: z.string().min(1),
  kind: z.enum(CONVERSATION_KIND),
  otherUserId: z.string().min(1),
});
export type GetOrCreateConversationInput = z.infer<typeof schema>;

/**
 * Open (or create) the conversation between `userId` and `otherUserId`.
 *
 * - kind "dm": requires an accepted friendship and no block (either way).
 * - kind "therapist": `otherUserId` is the therapist's user; requires the
 *   client to have a confirmed/completed booking with that therapist.
 *
 * The user pair is stored canonically sorted, so the unique index makes this a
 * safe upsert under races.
 */
export async function getOrCreateConversation(input: {
  userId: string;
  kind: (typeof CONVERSATION_KIND)[number];
  otherUserId: string;
}): Promise<GetOrCreateConversationResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { userId, kind, otherUserId } = parsed.data;

  if (userId === otherUserId) {
    return { ok: false, error: "You can't message yourself." };
  }

  const db = getDb();

  let therapistId: string | null = null;
  if (kind === "dm") {
    if (!(await dmAllowed(db, userId, otherUserId))) {
      return {
        ok: false,
        error: "You can only message people you're connected with.",
      };
    }
  } else {
    therapistId = await resolveTherapistConversation(db, userId, otherUserId);
    if (!therapistId) {
      return {
        ok: false,
        error: "You can only message a therapist you have a booking with.",
      };
    }
  }

  const [one, two] = sortPair(userId, otherUserId);
  const [existing] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.kind, kind),
        eq(conversations.userOneId, one),
        eq(conversations.userTwoId, two),
      ),
    )
    .limit(1);
  if (existing) return { ok: true, conversationId: existing.id };

  try {
    const [created] = await db
      .insert(conversations)
      .values({ kind, userOneId: one, userTwoId: two, therapistId })
      .returning({ id: conversations.id });
    return { ok: true, conversationId: created.id };
  } catch {
    // Lost the unique-index race — fetch the row the other writer created.
    const [again] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.kind, kind),
          eq(conversations.userOneId, one),
          eq(conversations.userTwoId, two),
        ),
      )
      .limit(1);
    if (again) return { ok: true, conversationId: again.id };
    return { ok: false, error: "We couldn't open the conversation. Please try again." };
  }
}
