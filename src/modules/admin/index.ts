/**
 * admin — public API.
 *
 * The admin module owns no DB tables (ARCHITECTURE.md §1.1): it composes the
 * `identity`, `therapists`, and `booking` modules behind an access policy.
 * This file contains ONLY re-exports.
 */

// --- Access policy ---------------------------------------------------------
export {
  isAdminRole,
  ADMIN_ROLES,
  requireAdmin,
  getAdminUser,
} from "./lib/policies";
export type { AdminRole } from "./lib/policies";

// --- Server actions --------------------------------------------------------
export { deleteUserAction } from "./actions/delete-user";
export type { DeleteUserInput, DeleteUserResult } from "./actions/delete-user";

export { createTherapistLoginAction } from "./actions/create-therapist-login";
export type {
  CreateTherapistLoginInput,
  CreateTherapistLoginResult,
} from "./actions/create-therapist-login";

export { reviewReportAction } from "./actions/review-report";
export type {
  ReviewReportInput,
  ReviewReportResult,
} from "./actions/review-report";
