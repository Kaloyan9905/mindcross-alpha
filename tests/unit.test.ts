/**
 * Pure-function unit tests — no database, fast. Cover the security- and
 * validation-critical helpers across the app.
 */
import { describe, expect, it } from "vitest";

import { safeCallbackUrl } from "@/lib/safe-redirect";
import { slugify } from "@/modules/therapists/lib/slug";
import { registerSchema, loginSchema } from "@/modules/identity/lib/validators";
import { therapistFilterSchema } from "@/modules/therapists/lib/filters";
import { isLocale, LOCALE_META } from "@/lib/i18n/config";
import { regionByCode } from "@/modules/safety/lib/crisis-lines";

describe("safeCallbackUrl (open-redirect guard)", () => {
  it("accepts a normal same-origin relative path", () => {
    expect(safeCallbackUrl("/account/messages")).toBe("/account/messages");
  });

  it("falls back for missing/empty/array values", () => {
    expect(safeCallbackUrl(undefined)).toBe("/account");
    expect(safeCallbackUrl(null)).toBe("/account");
    expect(safeCallbackUrl("")).toBe("/account");
    expect(safeCallbackUrl(["/account/friends", "/x"])).toBe("/account/friends");
  });

  it("rejects protocol-relative, absolute, scheme, and backslash tricks", () => {
    expect(safeCallbackUrl("//evil.com")).toBe("/account");
    expect(safeCallbackUrl("https://evil.com")).toBe("/account");
    expect(safeCallbackUrl("javascript:alert(1)")).toBe("/account");
    expect(safeCallbackUrl("/\\evil.com")).toBe("/account");
    expect(safeCallbackUrl("not-a-path")).toBe("/account");
  });

  it("rejects encoded protocol-relative tricks after decoding", () => {
    expect(safeCallbackUrl("/%2F%2Fevil.com")).toBe("/account");
  });

  it("honors a custom fallback", () => {
    expect(safeCallbackUrl("//x", "/login")).toBe("/login");
  });
});

describe("slugify", () => {
  it("strips diacritics and lowercases", () => {
    expect(slugify("Renée Müller")).toBe("renee-muller");
  });

  it("collapses punctuation/whitespace and trims hyphens", () => {
    expect(slugify("  Hello,  World!  ")).toBe("hello-world");
    expect(slugify("--Anna__Petrova--")).toBe("anna-petrova");
  });

  it("returns empty for a name with no latin chars", () => {
    expect(slugify("Олена")).toBe("");
  });
});

describe("registerSchema", () => {
  const base = {
    name: "Test User",
    email: "user@example.com",
    password: "correct-horse-battery-staple",
    confirmPassword: "correct-horse-battery-staple",
    consent: true as const,
  };

  it("accepts valid input", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a short password", () => {
    expect(
      registerSchema.safeParse({ ...base, password: "short", confirmPassword: "short" }).success,
    ).toBe(false);
  });

  it("rejects mismatched passwords on the confirm field", () => {
    const r = registerSchema.safeParse({ ...base, confirmPassword: "different-but-long-enough" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("confirmPassword"))).toBe(true);
    }
  });

  it("requires consent and a valid email", () => {
    expect(registerSchema.safeParse({ ...base, consent: false }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials and rejects blanks", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("therapistFilterSchema", () => {
  it("applies defaults for an empty query", () => {
    const r = therapistFilterSchema.parse({});
    expect(r.sort).toBe("name");
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(12);
  });

  it("coerces page/pageSize from strings", () => {
    const r = therapistFilterSchema.parse({ page: "3", pageSize: "24" });
    expect(r.page).toBe(3);
    expect(r.pageSize).toBe(24);
  });

  it("rejects an oversized pageSize and a bad sort", () => {
    expect(therapistFilterSchema.safeParse({ pageSize: 100 }).success).toBe(false);
    expect(therapistFilterSchema.safeParse({ sort: "relevance" }).success).toBe(false);
  });
});

describe("i18n locale config", () => {
  it("validates the supported locales", () => {
    for (const l of ["en", "uk", "ar", "es"]) expect(isLocale(l)).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale("")).toBe(false);
  });

  it("marks Arabic as RTL and the rest LTR", () => {
    expect(LOCALE_META.ar.dir).toBe("rtl");
    expect(LOCALE_META.en.dir).toBe("ltr");
    expect(LOCALE_META.uk.dir).toBe("ltr");
  });
});

describe("crisis-lines regionByCode", () => {
  it("returns a region with helplines, or undefined for unknown", () => {
    const eu = regionByCode("eu");
    expect(eu?.lines.length).toBeGreaterThan(0);
    expect(regionByCode("de")?.label).toBe("Germany");
    expect(regionByCode("zz")).toBeUndefined();
  });
});
