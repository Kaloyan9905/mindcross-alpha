# MindCross MVP — Runtime Smoke Test

**Tester:** Tester #2 — Runtime Smoke Testing
**Date:** 2026-05-20
**Build:** Next.js 16.2.6 production build (`next build` passed, `.next/` present)
**Server:** `npx next start` on `http://localhost:3000`
**Database:** local Postgres (Docker) on `localhost:5432` — migrated + seeded (10 active therapists, 38 availability slots, 3 pending applications)
**Method:** `curl` against the running production server. Status via `curl -s -o /dev/null -w "%{http_code}"`; redirect routes checked **without** `-L` so the 3xx is observed directly.

> **Update (2026-05-30):** This is a point-in-time record of the 2026-05-20 run.
> **Issue #1 (login `UnsupportedStrategy`) has since been RESOLVED** — `auth.ts`
> uses `strategy: "jwt"` and credentials sign-in works. The integration suite is
> now **25 passing tests** (identity, therapists, booking, admin, reminders).

---

## Results Table

| # | Route | Method | Expected | Actual status | Body check | Result |
|---|-------|--------|----------|---------------|------------|--------|
| 1 | `/` | GET | 200 | 200 | hero copy "speaks your language" + "MindCross" present | **PASS** |
| 2 | `/our-mission` | GET | 200 | 200 | "Our Mission" / mission copy present | **PASS** |
| 3 | `/find-a-therapist` | GET | 200 | 200 | seeded therapists render (Anna Petrova, Diego Fernandez, ...) | **PASS** |
| 4 | `/join-as-therapist` | GET | 200 | 200 | careers / "therapist" copy present | **PASS** |
| 5 | `/contact` | GET | 200 | 200 | contact page content present | **PASS** |
| 6 | `/login` | GET | 200 | 200 | `<form>` with `type="email"` + `type="password"` inputs present | **PASS** |
| 7 | `/register` | GET | 200 | 200 | `<form>` with email + two password inputs present | **PASS** |
| 8 | `/api/health` | GET | 200, JSON, status ok | 200 | `{"status":"ok",...,"database":{"ok":true,"latencyMs":2}}` | **PASS** |
| 9 | `/therapists/anna-petrova` | GET | 200 | 200 | therapist name "Anna Petrova" in body | **PASS** |
| 10 | `/therapists/this-slug-does-not-exist-xyz` | GET | 404 | 404 | "404" / not-found page rendered | **PASS** |
| 11 | `/account` | GET | 3xx → /login | 307 | `Location: /login?callbackUrl=%2Faccount` | **PASS** |
| 12 | `/admin` | GET | 3xx → /login | 307 | `Location: /login?callbackUrl=%2Fadmin` | **PASS** |
| 13 | `/admin/therapists` | GET | 3xx → /login | 307 | `Location: /login?callbackUrl=%2Fadmin%2Ftherapists` | **PASS** |
| 14 | `/admin/bookings` | GET | 3xx → /login | 307 | `Location: /login?callbackUrl=%2Fadmin%2Fbookings` | **PASS** |

**Score: 14 PASS / 0 FAIL** on the route smoke test.

---

## Additional runtime probe (beyond the route table)

| Probe | Method | Result | Notes |
|-------|--------|--------|-------|
| Credentials sign-in | POST `/api/auth/callback/credentials` | **HTTP 500** | Login is functionally broken — see Issue #1 below. |

---

## Issues Found

The route-by-route GET smoke test passes cleanly, but the server logs and a follow-up POST probe surfaced **one functional defect** and **one configuration warning**. No application code was changed.

### Issue #1 — ✅ RESOLVED (was BLOCKER): Login fails (`UnsupportedStrategy`)

- **Resolution (2026-05-30):** Fixed. `src/modules/identity/lib/auth.ts` now sets
  `session: { strategy: "jwt" }`, which is the supported strategy for the
  Credentials provider. Credentials sign-in works; the original report below is
  retained for history.
- **Severity:** High — credentials login is non-functional.
- **Symptom:** The server log emits `[auth][error] UnsupportedStrategy: Signing in with credentials only supported if JWT strategy is enabled` repeatedly (28+ occurrences). A direct `POST /api/auth/callback/credentials` returns **HTTP 500** and increments the error count, confirming it is reproducible at runtime — not just a build-time prerender artifact.
- **Root cause:** `src/modules/identity/lib/auth.ts` configures `session: { strategy: "database" }` while also registering a `Credentials` provider. Auth.js v5 (`next-auth@5.0.0-beta.31`) **does not support the Credentials provider with the database session strategy** — credentials sign-in requires `strategy: "jwt"`. The two settings are mutually incompatible.
- **Impact:** All GET routes render correctly and auth-gated routes correctly redirect to `/login`, but a user who submits the login form cannot actually authenticate. Any flow that depends on being logged in (`/account`, `/admin/*`) is therefore unreachable through the UI.
- **Fix (not applied — for the dev team):** Either switch `strategy` to `"jwt"` in `src/modules/identity/lib/auth.ts`, or replace the Credentials provider with a provider compatible with the database strategy. The DrizzleAdapter / `sessions` table is otherwise wired up.

### Issue #2 — WARNING: `next start` vs `output: "standalone"`

- **Severity:** Low — does not affect this smoke test; relevant for deployment.
- **Symptom:** On startup the server prints: `⚠ "next start" does not work with "output: standalone" configuration. Use "node .next/standalone/server.js" instead.`
- **Root cause:** `next.config.ts` sets `output: "standalone"`. The smoke test was run via `npx next start` (per the test brief) and served all routes correctly, so `next start` is in fact working here — but in a real deployment the standalone output is intended to be launched with `node .next/standalone/server.js`.
- **Impact:** None on the smoke test. The dev/ops team should confirm the intended start command for production deployment.

---

## Verdict

**The site runs.** The production build serves successfully and every one of the 14 smoke-tested routes behaves correctly:

- All 8 public routes return HTTP 200 with the expected content (homepage hero, mission, seeded therapist list, careers, contact, login/register forms, health JSON).
- The health endpoint reports `status: ok` with a passing database check (`latencyMs` ~2ms) — DB connectivity is confirmed.
- The therapist profile route renders a real seeded profile (200) and a bogus slug correctly returns 404.
- All 4 auth-gated routes correctly redirect unauthenticated users (307) to `/login` with a `callbackUrl`.

**However, the MVP is not fully functional:** credentials login is broken (Issue #1 — `UnsupportedStrategy`, HTTP 500 on sign-in POST). The site is browsable and the public/marketing surface is solid, but no user can log in until the Auth.js session strategy conflict is resolved. **Recommend fixing Issue #1 before any release.**
