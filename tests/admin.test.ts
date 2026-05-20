/**
 * Tests for admin access logic and the admin therapist listing.
 *
 * `isAdminRole` is a pure function from the admin module's public API.
 * `listTherapistsAdmin` is exported by the therapists module (the admin module
 * composes it) — it lists ALL therapists regardless of status.
 */
import { describe, expect, it } from "vitest";

// `isAdminRole` is re-exported by `@/modules/admin`, but that barrel also
// surfaces `requireAdmin`, whose `policies.ts` imports `getCurrentUser` from
// the identity barrel -> Auth.js `next-auth` -> `next/server`, which Vitest's
// resolver cannot load. Importing the pure `isAdminRole` from its source file
// exercises the exact same function without that runtime-only chain.
import { isAdminRole } from "@/modules/admin/lib/policies";
import { listTherapistsAdmin } from "@/modules/therapists";

describe("isAdminRole", () => {
  it("treats admin_* roles as staff", () => {
    expect(isAdminRole("admin_ops")).toBe(true);
    expect(isAdminRole("admin_super")).toBe(true);
    expect(isAdminRole("admin_clinical")).toBe(true);
    expect(isAdminRole("admin_support")).toBe(true);
  });

  it("treats client and therapist as non-staff", () => {
    expect(isAdminRole("client")).toBe(false);
    expect(isAdminRole("therapist")).toBe(false);
  });
});

describe("listTherapistsAdmin", () => {
  it("returns all seeded therapists with a compact admin projection", async () => {
    const rows = await listTherapistsAdmin();

    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(10);

    const [first] = rows;
    expect(first?.id).toBeTypeOf("string");
    expect(first?.slug).toBeTypeOf("string");
    expect(first?.displayName).toBeTypeOf("string");
    expect(first?.email).toBeTypeOf("string");
    expect(first?.status).toBeTypeOf("string");
  });
});
