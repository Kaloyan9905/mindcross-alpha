// Aggregator for Drizzle schema discovery. Each feature module owns its
// tables under `src/modules/<name>/db/schema.ts`; this file re-exports them
// so `drizzle.config.ts` and the Drizzle client (src/lib/db/index.ts) see a
// single combined schema namespace.
//
// Do not declare tables directly in this file — keep them inside their owning
// module so cross-module imports stay traceable.

export * from "@/modules/identity/db/schema";
export * from "@/modules/therapists/db/schema";
export * from "@/modules/booking/db/schema";
