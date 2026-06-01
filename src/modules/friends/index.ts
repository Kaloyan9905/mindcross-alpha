/**
 * Public API for the friends module — the client-only friend graph: requests,
 * accepted friendships, blocks, and abuse reports.
 *
 * Cores in `lib/` take an already-authenticated id and re-check every
 * relationship; the `"use server"` actions resolve the session and never trust
 * caller-supplied ids. Tests import cores from source (the barrel re-exports
 * session-bound actions that pull in next-auth, which Vitest can't load).
 */

// Actions (session-bound)
export { sendFriendRequestAction } from "./actions/send-friend-request";
export { respondToRequestAction } from "./actions/respond-to-request";
export { removeFriendAction } from "./actions/remove-friend";
export { blockUserAction, unblockUserAction } from "./actions/block-user";
export { reportUserAction } from "./actions/report-user";
export { searchClientsAction } from "./actions/search-clients";
export { listFriendsAction } from "./actions/list-friends";

// Cores (tests + internal server use)
export { sendFriendRequest } from "./lib/send-friend-request";
export { respondToRequest } from "./lib/respond-to-request";
export { removeFriend } from "./lib/remove-friend";
export { blockUser } from "./lib/block-user";
export { unblockUser } from "./lib/unblock-user";
export { reportUser } from "./lib/report-user";
export {
  areFriends,
  blockExistsEitherWay,
  findFriendship,
} from "./lib/friendship-status";
export type { FriendResult } from "./lib/result";

// Queries
export { searchClients } from "./queries/search-clients";
export type {
  ClientSearchResult,
  ConnectionState,
} from "./queries/search-clients";
export { listFriends } from "./queries/list-friends";
export type { FriendRow } from "./queries/list-friends";
export {
  listIncomingRequests,
  listOutgoingRequests,
} from "./queries/list-requests";
export type { FriendRequestRow } from "./queries/list-requests";
export { listReports } from "./queries/list-reports";
export type { ReportListRow } from "./queries/list-reports";

// Schema + domain types
export {
  friendships,
  userBlocks,
  userReports,
  FRIENDSHIP_STATUS,
  REPORT_REASON,
  REPORT_STATUS,
} from "./db/schema";
export type {
  Friendship,
  UserBlock,
  UserReport,
  FriendshipStatus,
  ReportReason,
  ReportStatus,
} from "./db/schema";
