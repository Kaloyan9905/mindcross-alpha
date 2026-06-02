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
  isSuperAdmin,
  ADMIN_ROLES,
  requireAdmin,
  getAdminUser,
} from "./lib/policies";
export type { AdminRole } from "./lib/policies";

export { setUserRole } from "./lib/set-user-role";
export type { SetUserRoleInput, SetUserRoleResult } from "./lib/set-user-role";

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

export { setUserRoleAction } from "./actions/set-user-role";
export type { SetUserRoleActionInput } from "./actions/set-user-role";
