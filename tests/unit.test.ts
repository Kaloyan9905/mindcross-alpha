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
import { getIceServers } from "@/modules/meeting/lib/ice";
import {
  isJoinable,
  isMissed,
  isLive,
  sessionPhase,
} from "@/modules/booking/lib/session-lifecycle";
import {
  startOfWeek,
  daysOfWeek,
  monthGridDays,
  dayBlockBounds,
  addDays,
} from "@/lib/calendar";

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

describe("session lifecycle (grace period)", () => {
  const at = (iso: string) => new Date(iso);
  const base = (over: Partial<{ status: string; startedAt: Date | null }> = {}) => ({
    status: "confirmed",
    startsAt: at("2026-06-02T14:00:00Z"),
    endsAt: at("2026-06-02T14:45:00Z"),
    startedAt: null as Date | null,
    ...over,
  });

  it("stays joinable through the grace window (14:00 session at 14:05)", () => {
    const now = at("2026-06-02T14:05:00Z");
    expect(isJoinable(base(), now)).toBe(true);
    expect(isLive(base(), now)).toBe(true);
    expect(sessionPhase(base(), now)).toBe("live");
  });

  it("becomes a no-show only after the grace with nobody joined (at 14:11)", () => {
    const late = at("2026-06-02T14:11:00Z");
    expect(isMissed(base(), late)).toBe(true);
    expect(isJoinable(base(), late)).toBe(false);
    expect(sessionPhase(base(), late)).toBe("missed");
  });

  it("a joined session stays live until its scheduled end", () => {
    const joined = base({ startedAt: at("2026-06-02T14:02:00Z") });
    const late = at("2026-06-02T14:30:00Z");
    expect(isJoinable(joined, late)).toBe(true);
    expect(isMissed(joined, late)).toBe(false);
  });

  it("derives upcoming / cancelled / ended / missed phases", () => {
    expect(sessionPhase(base(), at("2026-06-02T13:50:00Z"))).toBe("upcoming");
    expect(sessionPhase(base({ status: "cancelled" }), new Date())).toBe("cancelled");
    expect(sessionPhase(base({ status: "completed" }), new Date())).toBe("ended");
    expect(sessionPhase(base({ status: "no_show" }), new Date())).toBe("missed");
  });
});

describe("calendar helpers", () => {
  it("startOfWeek returns the Monday 00:00 of the week", () => {
    const wed = new Date(2026, 5, 3, 15, 30); // Wed 3 Jun 2026
    const mon = startOfWeek(wed);
    expect(mon.getDay()).toBe(1); // Monday
    expect(mon.getDate()).toBe(1); // Mon 1 Jun
    expect(mon.getHours()).toBe(0);
    expect(mon.getMinutes()).toBe(0);
  });

  it("daysOfWeek is 7 days Mon→Sun", () => {
    const days = daysOfWeek(new Date(2026, 5, 3));
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1);
    expect(days[6].getDay()).toBe(0);
  });

  it("monthGridDays is 42 days starting on a Monday", () => {
    const grid = monthGridDays(new Date(2026, 5, 15));
    expect(grid).toHaveLength(42);
    expect(grid[0].getDay()).toBe(1);
  });

  it("dayBlockBounds clamps an event to a day in minutes", () => {
    const day = new Date(2026, 5, 3);
    const b = dayBlockBounds(new Date(2026, 5, 3, 9, 0), new Date(2026, 5, 3, 10, 30), day);
    expect(b).toEqual({ top: 540, bottom: 630 });
    expect(dayBlockBounds(new Date(2026, 5, 3, 9, 0), new Date(2026, 5, 3, 10, 0), addDays(day, 1))).toBeNull();
    // A multi-day block fills the whole middle day.
    expect(dayBlockBounds(new Date(2026, 5, 2, 12, 0), new Date(2026, 5, 5, 12, 0), day)).toEqual({
      top: 0,
      bottom: 1440,
    });
  });
});

describe("meeting getIceServers", () => {
  it("returns public STUN and no TURN by default", async () => {
    delete process.env.MEETING_TURN_URL;
    const s = await getIceServers();
    expect(s.length).toBeGreaterThan(0);
    expect(s.some((x) => String(x.urls).startsWith("stun:"))).toBe(true);
    expect(s.some((x) => String(x.urls).startsWith("turn:"))).toBe(false);
  });

  it("appends a configured TURN relay with static credentials", async () => {
    process.env.MEETING_TURN_URL = "turn:turn.example.com:3478";
    process.env.MEETING_TURN_USERNAME = "u";
    process.env.MEETING_TURN_CREDENTIAL = "p";
    try {
      const turn = (await getIceServers()).find((x) => String(x.urls).startsWith("turn:"));
      expect(turn?.username).toBe("u");
      expect(turn?.credential).toBe("p");
    } finally {
      delete process.env.MEETING_TURN_URL;
      delete process.env.MEETING_TURN_USERNAME;
      delete process.env.MEETING_TURN_CREDENTIAL;
    }
  });

  it("mints short-lived coturn credentials from a shared secret", async () => {
    process.env.MEETING_TURN_URL = "turn:turn.example.com:3478";
    process.env.MEETING_TURN_SECRET = "shared-secret";
    try {
      const turn = (await getIceServers()).find((x) => String(x.urls).startsWith("turn:"));
      // username is a future unix-second expiry; credential is base64 HMAC.
      const expiry = Number(turn?.username);
      expect(Number.isInteger(expiry)).toBe(true);
      expect(expiry).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(turn?.credential).toMatch(/^[A-Za-z0-9+/]+=*$/);
    } finally {
      delete process.env.MEETING_TURN_URL;
      delete process.env.MEETING_TURN_SECRET;
    }
  });
});
