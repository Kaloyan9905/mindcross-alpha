import { handlers } from "@/modules/identity/lib/auth";

// Auth.js v5 App Router catch-all. The handlers come from the NextAuth()
// config in the identity module; this file only wires them to the route.
export const { GET, POST } = handlers;
