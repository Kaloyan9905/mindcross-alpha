# MindCross — Architecture

Audience: the 5 senior devs building the MVP in parallel. This document is
**load-bearing** — every PR should be consistent with it. If you find
yourself wanting to break one of these conventions, raise it in chat first.

MindCross is a culturally-matched therapy booking platform for migrants,
refugees, and international students. The MVP is a single Next.js 16 App
Router app, deployed on Vercel, talking to a single Postgres instance via
Drizzle ORM. No external services at MVP — see "MVP-lite scope" below.

---

## 1. Module map

Each feature lives under `src/modules/<name>/`. A module's public API is its
`index.ts`; **no other module is allowed to deep-import from a module's
internals**. If you need something from another module, add it to that
module's `index.ts` re-exports.

```
src/modules/
  identity/        Auth, users, sessions, roles, password hashing
  therapists/      Therapist profiles, availability slots, applications
  matching/        Filters-only search over active therapists (no scoring)
  booking/         Booking lifecycle: create / cancel / list
  notifications/   Mock email (writes to dev-emails/ + console.log)
  admin/           Admin dashboards: review applications, manage therapists,
                   view bookings. Composes from the other modules.
```

`careers` is **not** its own module. The "join as therapist" page submits
to the `therapists` module (it writes to `therapist_applications`). Keep it
inside `src/modules/therapists/` to avoid duplication.

### 1.1 Public API surface — what each `index.ts` must re-export

> `?` = optional / "if you happen to need it". `*` = must export for the
> module to be usable by others.

**identity/index.ts**
- `*` `auth`, `signIn`, `signOut`, `handlers` (from `./auth`)
- `*` `getCurrentUser()`, `requireUser()`, `requireRole(role)` (server helpers)
- `*` types: `User`, `UserRole`, `USER_ROLES`
- `*` table refs: `users`, `accounts`, `sessions`, `verificationTokens`
- `?` zod schemas for login / register forms

**therapists/index.ts**
- `*` `listTherapists(filters)`, `getTherapistBySlug(slug)`,
  `getTherapistAvailability(therapistId, range)`
- `*` `submitTherapistApplication(input)`
- `*` admin: `approveApplication(id, by)`, `setTherapistStatus(id, status)`
- `*` types: `Therapist`, `TherapistStatus`, `TherapistGender`,
  `AvailabilitySlot`, `TherapistApplication`,
  `TherapistApplicationStatus`
- `*` table refs: `therapists`, `availabilitySlots`,
  `therapistApplications`

**matching/index.ts**
- `*` `MATCH_LANGUAGES`, `MATCH_SPECIALIZATIONS`,
  `MATCH_CULTURAL_BACKGROUNDS` (canonical filter vocabularies)
- `*` `matchTherapists(filters)` — thin wrapper around
  `therapists.listTherapists` with input-validation and result shaping for
  the public `/find-therapist` page.
- `*` `MatchFilters` zod schema + inferred type

**booking/index.ts**
- `*` `createBooking({ clientId, therapistId, slotId, clientNotes })`
- `*` `cancelBooking(bookingId, byUserId, reason?)`
- `*` `listBookingsForClient(clientId)`, `listBookingsForTherapist(therapistId)`
- `*` `getBooking(id)` (with authorization checks)
- `*` types: `Booking`, `BookingStatus`
- `*` table ref: `bookings`

**notifications/index.ts**
- `*` `sendEmail({ to, subject, template, data })` — writes a JSON file to
  `dev-emails/<timestamp>-<to>-<template>.json` and logs to `console.log`.
- `*` `EmailTemplate` union: `'welcome' | 'booking_confirmed' |
  'booking_cancelled' | 'application_received' | 'application_approved' |
  'application_rejected' | 'password_reset'`.
- `?` `renderEmail(template, data)` returning `{ subject, text, html }`.

**admin/index.ts**
- `*` server-only helpers that compose the modules above. Do not store new
  tables here. Examples: `listPendingApplications()`,
  `getBookingsAdminView({ from, to })`.

### 1.2 Folder layout inside a module

```
src/modules/<name>/
  index.ts          ONLY re-exports — no logic
  db/
    schema.ts       Drizzle tables owned by this module
  server/           server-only code (queries, server actions, mutations)
    queries.ts
    actions.ts
    <feature>.ts
  lib/              pure helpers shared inside the module
  ui/               module-specific React components (e.g. TherapistCard).
                    Generic primitives live in src/components/ui/* and are
                    owned by the UI/UX agent — do not put them here.
  __tests__/        vitest unit tests
```

Routes (`src/app/...`) **never** define DB queries or business logic
themselves. They import from the relevant module's `index.ts`, validate
input with zod, and render the result.

---

## 2. Schema overview

Seven tables, three modules. All in the public schema, snake_case names.

| Table                    | Module     | Purpose                                                                |
| ------------------------ | ---------- | ---------------------------------------------------------------------- |
| `users`                  | identity   | Authenticated identities. One row per human (client, therapist, admin).|
| `accounts`               | identity   | Auth.js OAuth provider links keyed on (provider, provider_account_id). |
| `sessions`               | identity   | Auth.js DB-strategy sessions. Token → user mapping with expiry.        |
| `verification_tokens`    | identity   | Auth.js email-link verification tokens.                                |
| `therapists`             | therapists | Public-facing therapist profile (languages, culture, specializations). |
| `availability_slots`     | therapists | Bookable timeslots owned 1:N by a therapist.                           |
| `therapist_applications` | therapists | Inbound applications from the careers funnel; reviewed by admin_ops.   |
| `bookings`               | booking    | Confirmed sessions between a client and a therapist.                   |

### 2.1 Why some columns are nullable

- `users.password_hash` — NULL for OAuth-only users.
- `therapists.user_id` — a therapist record may be drafted by ops before
  the therapist's user account exists, and survives deletion of the user
  (ON DELETE SET NULL).
- `bookings.slot_id` — nullable so historical bookings outlive a deleted
  slot row (ON DELETE SET NULL).
- `bookings.cancelled_by` — NULL until a cancellation happens.

### 2.2 Denormalization decisions

- `bookings.starts_at`, `bookings.ends_at`, `bookings.join_url` are
  **snapshotted** from the slot / therapist at booking time. Subsequent
  edits to the therapist profile must not retroactively rewrite a confirmed
  session's meeting link.
- `availability_slots.is_booked` is updated transactionally with the
  booking insert (the create-booking server action both inserts the row and
  flips the flag in one DB transaction).

---

## 3. Conventions

### 3.1 IDs
- All primary keys are `text` columns holding a **UUIDv7** string.
- Generated in app code via `import { uuidv7 } from "uuidv7"`. Drizzle
  column constructors use `.$defaultFn(() => uuidv7())`.
- Do **not** generate IDs in the database (no `gen_random_uuid()`). This
  keeps IDs monotonic, lets us preview unsent records in tests, and avoids
  clock-skew surprises between Postgres and the app.

### 3.2 Timestamps
- All timestamps are `TIMESTAMPTZ` and stored UTC.
- Drizzle: `timestamp("col", { withTimezone: true, mode: "date" })`.
- `created_at` defaults to `now()` in the DB.
- `updated_at` is **maintained by application code** on insert and update.
  There is no DB trigger — keep updates inside server actions so the
  source of truth is in TypeScript.

### 3.3 Naming
- Database columns: `snake_case`.
- TypeScript properties: `camelCase`.
- Map between them via the Drizzle column constructor:
  `passwordHash: text("password_hash")`.

### 3.4 Enums
- Encoded in Postgres as `text` plus a `CHECK` constraint.
- Drizzle side uses the typed enum form: `text("status", { enum: [...] })`.
- Export the enum tuple as a `const` array (`export const BOOKING_STATUS =
  [...] as const`) and a derived union type (`export type BookingStatus =
  (typeof BOOKING_STATUS)[number]`). Use the tuple at runtime for zod
  validation and form options.

### 3.5 Foreign keys
- Always explicit `ON DELETE`. Never `NO ACTION` by accident.
- Conventions used in this schema:
  - `sessions.user_id`, `accounts.user_id` → `users` `ON DELETE CASCADE`
    (auth artifacts die with the user).
  - `availability_slots.therapist_id` → `therapists` `ON DELETE CASCADE`
    (slots are owned by the therapist).
  - `bookings.client_id` → `users` `ON DELETE CASCADE`
    (client withdrawal removes their booking history).
  - `bookings.therapist_id` → `therapists` `ON DELETE CASCADE`
    (deleted therapists take their bookings with them at MVP — we have no
    GDPR retention requirement carved out yet).
  - `bookings.slot_id`, `bookings.cancelled_by`,
    `therapist_applications.reviewed_by`, `therapists.user_id`
    → `ON DELETE SET NULL` (we want to keep the row history).

### 3.6 Module boundaries
- **All cross-module access goes through the target module's `index.ts`.**
  No `import "@/modules/therapists/server/queries"` from
  `src/modules/booking/...`. If `booking` needs a therapist query, it imports
  it from `@/modules/therapists`.
- Within a module, deep imports are fine.
- Tables for module A may be referenced (FKs) from module B's schema —
  that is expected. Just import the table object via the public API:
  `import { users } from "@/modules/identity/db/schema"` (one allowed
  exception: schema files are considered public).

### 3.7 zod input validation
- Every server action / route handler validates inputs with zod **at the
  boundary**. The DB layer must not be the first line of defense.

---

## 4. How to add a new feature (5-step playbook)

Take the example "client can leave a private note on a booking after the
session ends".

1. **Schema.** Add the column / table in the owning module's
   `src/modules/<name>/db/schema.ts`. Export the inferred row type.
   Re-export from `src/lib/db/schema.ts` if it's a new table.
2. **Migration.** Run `pnpm db:generate` (drizzle-kit) to produce a new
   `drizzle/000X_<name>.sql`. Hand-edit if you need a `CHECK`, GIN, or
   trigram index — `drizzle-kit` won't generate those.
3. **Query / action.** Add a function under
   `src/modules/<name>/server/<feature>.ts` that does the work. It owns:
   zod input parsing, authorization check, DB access, `updatedAt` bump.
   Re-export the function from the module's `index.ts` if it's part of the
   public API.
4. **Component.** Add or update a React component under
   `src/modules/<name>/ui/` (module-specific) or use the generic primitives
   from `src/components/ui/*`. The component is dumb — it calls the server
   action with form values.
5. **Wire into a page.** A page under `src/app/...` imports the component
   and the server-side reader (if any). Pages only orchestrate; they don't
   query the DB directly.

If your change touches more than one module, do it in two PRs: one for the
owning module's public API, then one for the consumer.

---

## 5. MVP-lite scope

Decisions baked into the schema and architecture:

- **Filters-only matching, no scoring.** `matching` is an `IN` / `&&` query
  over `therapists` filtered by `languages`, `specializations`,
  `cultural_background`, `gender`, `migration_experience`. No relevance
  score, no embeddings, no recommendation engine.
- **No payments.** Sessions are FREE. Bookings move directly to
  `confirmed`. There is no `payment_intent`, no Stripe, no
  `price_at_booking_time` column. `therapists.price_per_session_cents` is
  present so the UI can show "free at MVP", but it is informational only.
- **No video integration.** Therapists supply their own join URL
  (`therapists.session_url` — Zoom personal, Meet, Whereby, Jitsi). We
  snapshot it onto the booking as `bookings.join_url`.
- **English only at launch.** Copy is English; `languages` columns
  describe what the *therapist* speaks, not the UI.
- **Mock email.** `notifications.sendEmail` writes JSON files to
  `dev-emails/` and logs to `console.log`. No SMTP, no Resend, no
  Mailgun. The function signature should be the eventual real one so we
  can swap the impl later.
- **No file uploads.** `therapists.photo_url` is a free-form URL. The
  admin pastes a hosted URL for the MVP.
- **No real-time.** No websockets, no SSE. The therapist dashboard is
  reload-driven.

---

## 6. File-path ownership

The 5 devs in Phase 2 own non-overlapping module directories. Treat this
as a hard fence — touching a file outside your fence requires a chat
heads-up.

| Owner          | Owns                                                         |
| -------------- | ------------------------------------------------------------ |
| Dev: Identity  | `src/modules/identity/**`, `src/app/(auth)/**`, `src/app/api/auth/[...nextauth]/**` |
| Dev: Therapists| `src/modules/therapists/**`, `src/app/(public)/therapists/**`, `src/app/(public)/careers/**` |
| Dev: Matching  | `src/modules/matching/**`, `src/app/(public)/find-therapist/**` |
| Dev: Booking   | `src/modules/booking/**`, `src/app/(client)/bookings/**`, `src/app/(therapist)/sessions/**` |
| Dev: Admin     | `src/modules/admin/**`, `src/modules/notifications/**`, `src/app/(admin)/**`, `dev-emails/` |
| UI/UX agent    | `src/components/ui/**`, `src/components/shared/**`, `src/lib/utils.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `docs/DESIGN_SYSTEM.md` |
| Architect (this PR) | `src/modules/*/db/schema.ts`, `src/lib/db/schema.ts`, `drizzle/*.sql`, `docs/ARCHITECTURE.md` |

### Things NOT to do
- **Do not** add new npm packages. The library set is frozen for MVP.
  Anything you need is already in `package.json`.
- **Do not** modify `src/lib/db/index.ts`, `src/lib/db/migrate.ts`,
  `src/lib/env/server.ts`, `src/app/api/health/route.ts`, `package.json`,
  `pnpm-lock.yaml`, `Dockerfile`, `docker-compose.yml`.
- **Do not** modify another dev's module folder. If you need something
  from it, ask the owner to add it to that module's `index.ts`.
- **Do not** touch the root layout, `globals.css`, or
  `src/components/ui/*` — that is the UI/UX agent's territory.
- **Do not** introduce external services (SMTP, Stripe, S3, video). Mock
  them per Section 5.
- **Do not** generate UUIDs in SQL. Use `uuidv7()` from the `uuidv7`
  package in TypeScript.
- **Do not** rely on DB triggers for `updated_at`. Bump it in the server
  action.
- **Do not** swallow zod validation at the page level. Validate at the
  boundary of every public function the route exposes.

---

## 7. Local dev quick-reference

```
docker compose up -d        # postgres on :5432, db=mindcross
pnpm db:migrate             # apply drizzle/*.sql
pnpm dev                    # next dev --turbopack
```

Env: only `DATABASE_URL` is required at MVP. The lazy `env()` helper in
`src/lib/env/server.ts` is the only place env vars are validated.

The Drizzle client is a lazy singleton — call `getDb()` from
`@/lib/db` at the top of a server action, not at module top-level, so
`next build` doesn't connect.
