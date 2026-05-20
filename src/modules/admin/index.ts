/**
 * admin — public API.
 *
 * The admin module owns no DB tables (ARCHITECTURE.md §1.1): it composes the
 * `identity`, `therapists`, and `booking` modules behind an access policy.
 * This file contains ONLY re-exports.
 */

// --- Access policy ---------------------------------------------------------
export { isAdminRole, ADMIN_ROLES, requireAdmin } from "./lib/policies";
export type { AdminRole } from "./lib/policies";
