/**
 * Public API for the messaging module — conversations (client↔client DMs and
 * client↔therapist threads) and their messages.
 *
 * Gating lives in the cores: DMs require an accepted friendship (no block);
 * therapist threads require a confirmed/completed booking. Every gate is
 * re-checked on send. Tests import cores from source.
 */

// Actions (session-bound)
export { getOrCreateConversationAction } from "./actions/get-or-create-conversation";
export { startTherapistConversationAction } from "./actions/start-therapist-conversation";
export { sendMessageAction } from "./actions/send-message";
export { markReadAction } from "./actions/mark-read";

// Cores
export { getOrCreateConversation } from "./lib/get-or-create-conversation";
export type { GetOrCreateConversationResult } from "./lib/get-or-create-conversation";
export { sendMessage } from "./lib/send-message";
export type { SendMessageResult } from "./lib/send-message";
export { markRead } from "./lib/mark-read";
export type { MarkReadResult } from "./lib/mark-read";

// Queries
export { listConversations } from "./queries/list-conversations";
export type { ConversationSummary } from "./queries/list-conversations";
export { getConversationThread } from "./queries/get-conversation-thread";
export type {
  ConversationThread,
  ThreadMessage,
} from "./queries/get-conversation-thread";
export { unreadTotal } from "./queries/unread-total";
export { listTherapistConversations } from "./queries/list-therapist-conversations";

// Schema + domain types
export { conversations, messages, CONVERSATION_KIND } from "./db/schema";
export type { Conversation, Message, ConversationKind } from "./db/schema";
