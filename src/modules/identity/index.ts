/**
 * Identity module — public API.
 *
 * This file contains ONLY re-exports (ARCHITECTURE.md §1.2). Other modules
 * must import auth primitives, server actions, and types from here — never
 * deep-import the module internals.
 */

// --- Auth.js v5 primitives -------------------------------------------------
export { auth, signIn, signOut, handlers } from "@/modules/identity/lib/auth";

// --- Server-side session helpers ------------------------------------------
export {
  getCurrentUser,
  requireUser,
  requireRole,
} from "@/modules/identity/lib/server-helpers";
export type { SessionUser } from "@/modules/identity/lib/server-helpers";

// --- Server actions --------------------------------------------------------
export { registerAction } from "@/modules/identity/actions/register";
export type { RegisterResult } from "@/modules/identity/actions/register";
export { requestDeletionAction } from "@/modules/identity/actions/request-deletion";
export type { RequestDeletionResult } from "@/modules/identity/actions/request-deletion";

// --- Form schemas + inferred input types ----------------------------------
export {
  loginSchema,
  registerSchema,
} from "@/modules/identity/lib/validators";
export type {
  LoginInput,
  RegisterInput,
} from "@/modules/identity/lib/validators";

// --- Domain types ----------------------------------------------------------
export { USER_ROLES } from "@/modules/identity/db/schema";
export type { User, UserRole } from "@/modules/identity/db/schema";

// --- Table refs (schema files are a public surface, per §3.6) -------------
export {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/modules/identity/db/schema";
