# MindCross

**Culturally-matched therapy booking for migrants, refugees, and international students.**

MindCross helps people find a therapist who *speaks their language* — literally and
culturally. Instead of a relevance-scored "match", the MVP gives users a clear,
honest filter over a curated set of therapists: by spoken language, cultural
background, specialization, gender, and lived migration experience. The audience is
often emotionally overwhelmed and almost always on a phone, so the product optimises
for calm, plain language, and accessibility (WCAG 2.1 AA).

This repository (`mindcross-alpha`) is the production MVP — a single full-stack
Next.js application.

---

## Features

- **Public marketing site** — home (hero + value prop), Our Mission, Contact.
- **Therapist discovery** (`/find-a-therapist`) — filter active therapists by
  language, specialization, cultural background, gender, and migration experience.
  Filters-only, no scoring or recommendation engine.
- **Therapist profiles** (`/therapists/[slug]`) — public profile with bio,
  languages, specializations, and bookable availability slots.
- **Booking** — a signed-in client books a free session into an open availability
  slot; the slot is flipped to booked transactionally, and a confirmation email
  (with the therapist's join link) is sent. Sessions can be cancelled. Booking
  and cancellation are bound to the authenticated session, not a client-supplied id.
- **24h reminder email** — an idempotent scan (`/api/cron/reminders`, driven by a
  cron trigger) emails clients ~24h before their session. See **Background jobs**.
- **Client account** (`/account`) — signed-in clients see their bookings and can
  request account deletion (GDPR right to erasure).
- **Careers / "Join as a therapist"** (`/join-as-therapist`) — an application form
  that writes to `therapist_applications` for admin review.
- **Admin panel** (`/admin`, `/admin/therapists`, `/admin/bookings`, `/admin/users`)
  — review and approve applications, manage therapist status, view bookings, and
  process GDPR account erasures. Mutating admin actions self-authorize server-side.
- **Authentication & consent** — email + password via Auth.js v5 (Credentials
  provider, argon2id hashing, JWT sessions). Auth-gated routes redirect to
  `/login`. Signup captures GDPR consent (timestamp + policy version), linked to
  the static `/privacy` and `/disclaimer` pages.

---

## Stack

- **Next.js 16** (App Router, Turbopack) on **Node 22 LTS**
- **TypeScript** (strict)
- **PostgreSQL 16** — Docker locally; hosted Postgres (e.g. Neon) in production
- **Drizzle ORM** + Drizzle Kit
- **Auth.js v5** (`next-auth@5`) with the Drizzle adapter
- **Tailwind CSS 4** + **shadcn/ui** (Radix primitives)
- **Vitest** for integration tests
- **pnpm 11** as the package manager

---

## Project layout

Feature code is organised into **modules** under `src/modules/<name>/`. A module's
public API is its `index.ts`; cross-module imports go through that file only.

```
src/
├── app/                       App Router (route groups compose their own chrome)
│   ├── (marketing)/           public site: home, our-mission, contact,
│   │                          find-a-therapist, join-as-therapist, therapists/[slug]
│   ├── (auth)/                login, register
│   ├── (client)/              account (signed-in client area)
│   ├── (admin)/               admin dashboard, therapists, bookings
│   ├── api/auth/[...nextauth] Auth.js route handler
│   ├── api/health/            /api/health endpoint (app + database check)
│   └── layout.tsx             root layout (fonts, globals)
├── modules/
│   ├── identity/              auth, users, sessions, roles, password hashing
│   ├── therapists/            therapist profiles, availability, applications (careers)
│   ├── matching/              filters-only search over active therapists
│   ├── booking/               booking lifecycle: create / cancel / list
│   ├── notifications/         mock email (writes JSON to dev-emails/ + console.log)
│   └── admin/                 admin helpers composed from the modules above
├── components/
│   ├── ui/                    shadcn/ui primitives
│   └── shared/                navbar, footer
├── lib/
│   ├── db/                    Drizzle client (lazy singleton) + migrate script
│   └── env/                   Zod-validated server env
└── middleware.ts              route guards (redirects unauthenticated users)

drizzle/                       generated SQL migrations + meta
scripts/seed.ts                dev seed (therapists, slots, applications)
tests/                         Vitest integration tests
docs/                          ARCHITECTURE.md, DESIGN_SYSTEM.md, SMOKE_TEST.md
```

---

## Environment variables

Copy `.env.example` to `.env.local` and fill it in:

| Variable           | Required | Notes                                                              |
| ------------------ | -------- | ------------------------------------------------------------------ |
| `DATABASE_URL`     | yes      | Postgres connection string.                                        |
| `AUTH_SECRET`      | yes      | Secret for signing/encrypting Auth.js JWTs. Min 16 chars.          |
| `AUTH_TRUST_HOST`  | no       | `"true"` for local dev and Vercel.                                 |
| `CRON_SECRET`      | prod     | Bearer secret for the cron job endpoints (`/api/cron/*`). Optional in dev; required in production. |
| `NODE_ENV`         | no       | `development` / `production` / `test`. Defaults to `development`.  |

Generate an `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Env is validated lazily at runtime by `src/lib/env/server.ts` — `next build` does
not require a live database or env.

---

## Running locally

### Option A — Fully containerized (recommended)

Brings up Postgres **and** the web app in Docker.

```bash
docker compose up --build -d
```

Then migrate and seed the database (run against the containerized Postgres on
`localhost:5432`):

```bash
npx tsx src/lib/db/migrate.ts     # apply drizzle/*.sql
npx tsx scripts/seed.ts           # seed therapists, slots, applications
```

The app is at <http://localhost:3000>. Health check:

```bash
curl http://localhost:3000/api/health
```

`docker compose.yml` defines a fixed dev `AUTH_SECRET` for the `web` service —
override it with a real secret in any deployed environment.

> Stopping the stack: `docker compose down` keeps the seeded data (it lives in the
> `postgres_data` volume). `docker compose down -v` **wipes** it.

### Option B — Host Node + dockerized Postgres

Run only Postgres in Docker; run the Next.js app directly on your machine.

```bash
docker compose up -d postgres     # Postgres only, on :5432
cp .env.example .env.local        # then edit AUTH_SECRET etc.
pnpm install
npx tsx src/lib/db/migrate.ts     # apply migrations
npx tsx scripts/seed.ts           # seed data
pnpm dev                          # Next.js dev server on :3000
```

> **Windows tooling note:** on some Windows setups `pnpm <script>` runs a deps
> pre-check that fails. If that happens, run tools directly instead:
> `npx next build`, `npx next start`, `npx tsc --noEmit`, `npx eslint src`,
> `npx vitest run`, `npx tsx <file>`.

---

## Database: migrate & seed

| Action  | Command                              | What it does                                                        |
| ------- | ------------------------------------ | ------------------------------------------------------------------- |
| Migrate | `npx tsx src/lib/db/migrate.ts`      | Applies the SQL files in `drizzle/`.                                |
| Seed    | `npx tsx scripts/seed.ts`            | Inserts ~10 active therapists, their availability slots, and 3 pending applications. Idempotent: truncates therapist tables first; leaves `users` and `bookings` untouched. |
| Generate | `npx drizzle-kit generate`          | Generates a new migration from schema changes.                      |

Both scripts read `DATABASE_URL` from `.env.local` (and `.env`).

---

## Tests

Integration tests live in `tests/*.test.ts` and run against a live Postgres
(start one and seed it first — see **Running locally**).

```bash
pnpm test          # = vitest run (npx vitest run also works)
```

Current suite: 25 tests across identity, therapists, booking, admin, and the 24h
reminder scan. Test files run sequentially (`fileParallelism: false` in
`vitest.config.ts`) because several share the same Postgres rows.

---

## Scripts

`package.json` scripts (invoke with `pnpm <script>`, or directly with `npx` —
see the Windows note above):

| Script              | Command                  | Purpose                                          |
| ------------------- | ------------------------ | ------------------------------------------------ |
| `dev`               | `next dev --turbopack`   | Dev server.                                      |
| `build`             | `next build`             | Production build.                                |
| `start`             | `next start`             | Production server.                               |
| `lint`              | `eslint`                 | Lint.                                            |
| `typecheck`         | `tsc --noEmit`           | Type check.                                      |
| `db:generate`       | `drizzle-kit generate`   | Generate a migration from the schema.            |
| `db:migrate`        | `tsx src/lib/db/migrate.ts` | Apply pending migrations.                     |
| `db:seed`           | `tsx scripts/seed.ts`    | Seed dev data.                                   |
| `reminders:run`     | `tsx scripts/send-due-reminders.ts` | Run the 24h reminder scan once (local/cron-less). |
| `db:push`           | `drizzle-kit push`       | Push schema directly (dev only — skips migrations). |
| `db:studio`         | `drizzle-kit studio`     | Drizzle Studio (web GUI).                        |
| `test`              | `vitest run`             | Run the integration test suite (needs Postgres). |

---

## Background jobs

The only non-synchronous work at MVP is the **24h reminder email**. It is a €0,
schedule-agnostic scan rather than a durable Inngest function (see
`docs` / Confluence 9.5 Pattern 3):

- **Core:** `sendDueReminders()` (`src/modules/booking/lib/send-due-reminders.ts`)
  finds confirmed bookings starting within 24h that have no `reminder_sent_at`,
  claims each row atomically (`UPDATE … WHERE reminder_sent_at IS NULL`), and
  emails the client. Idempotent and concurrency-safe — overlapping runs never
  double-send, and a missed run catches up on the next tick.
- **Trigger:** `POST /api/cron/reminders`, guarded by `CRON_SECRET`
  (`Authorization: Bearer <CRON_SECRET>`). Point a free scheduler at it every
  15–60 min — a Cloudflare Cron Trigger (`[triggers] crons = ["*/30 * * * *"]`),
  a GitHub Actions schedule, or any cron. In production a missing `CRON_SECRET`
  makes the endpoint refuse to run.
- **Local:** `pnpm reminders:run` invokes the same scan from the CLI.

---

## Health check

`GET /api/health` returns `200` with:

```json
{
  "status": "ok",
  "timestamp": "...",
  "uptimeMs": 1234,
  "checks": {
    "app": { "ok": true },
    "database": { "ok": true, "latencyMs": 2 }
  },
  "durationMs": 3
}
```

It returns `503` if the database is unreachable.

---

## MVP scope — intentionally out

These are deliberate MVP cuts (see `docs/ARCHITECTURE.md` §5):

- **No payments.** Sessions are free; bookings move straight to `confirmed`. No
  Stripe, no pricing logic.
- **No video integration.** Therapists supply their own join URL (Zoom, Meet,
  Whereby, Jitsi); it is snapshotted onto the booking.
- **Filters-only matching.** No scoring, embeddings, or recommendation engine.
- **Mock email.** `notifications.sendEmail` writes JSON files to `dev-emails/` and
  logs to the console — no SMTP/Resend/Mailgun.
- **No file uploads.** Therapist photos are free-form hosted URLs.
- **English-only UI.** Copy is English; the `languages` data describes what the
  *therapist* speaks.
- **JWT sessions.** Auth.js v5 requires the JWT strategy for the Credentials
  provider. Sessions are stateless and cannot be revoked server-side before their
  14-day expiry.

---

## Deploy to Vercel

The app is built for Vercel (`next.config.ts` uses `output: "standalone"`, which
Vercel handles natively).

1. Push the repo to GitHub.
2. In Vercel, **import** the repository as a new project (Next.js is auto-detected).
3. Provision a hosted Postgres (e.g. Neon) and copy its connection string.
4. Set the project **environment variables**:
   - `DATABASE_URL` — the hosted Postgres connection string.
   - `AUTH_SECRET` — a fresh 32-byte base64 secret (do not reuse the dev value).
   - `AUTH_TRUST_HOST` — `true`.
5. Run the migrations against the hosted database
   (`DATABASE_URL=<prod-url> npx tsx src/lib/db/migrate.ts`), then optionally seed.
6. Deploy.

---

See `docs/ARCHITECTURE.md` and `docs/DESIGN_SYSTEM.md` for the module conventions,
schema, and design system.
