# mindcross-alpha

Alpha skeleton for the MindCross production MVP — Next.js full-stack with PostgreSQL and Drizzle. No business logic yet; just a health endpoint and the database wired up.

Architecture: see Confluence [9. Next.js MVP Architecture](https://milchevkaloian.atlassian.net/wiki/spaces/Mindcross/pages/1638401).

## Stack

- Next.js 16 (App Router) on Node 22 LTS
- TypeScript strict
- PostgreSQL 16 (Docker locally; Neon in production)
- Drizzle ORM + Drizzle Kit
- Tailwind CSS 4
- pnpm 11

## Quickstart

### Fully containerized (recommended)

```bash
docker compose up --build
```

Then:

```bash
curl http://localhost:3000/api/health
```

Open <http://localhost:3000> in a browser.

### Host node + dockerized Postgres

```bash
docker compose up -d postgres
cp .env.example .env.local
pnpm install
pnpm dev
```

## Health check

`GET /api/health` returns:

```json
{
  "status": "ok",
  "timestamp": "...",
  "uptimeMs": 1234,
  "checks": {
    "app": { "ok": true },
    "database": { "ok": true, "latencyMs": 3 }
  },
  "durationMs": 4
}
```

Returns `503` if the database is unreachable.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Next.js dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Production server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:generate` | Generate a new Drizzle migration from the schema |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:push` | Push schema directly (dev only — bypasses migrations) |
| `pnpm db:studio` | Open Drizzle Studio (web GUI) |

## Layout

```
src/
├── app/                            App Router (UI + Route Handlers)
│   ├── api/health/route.ts         /api/health endpoint
│   ├── layout.tsx
│   └── page.tsx
├── modules/                        feature modules (none yet)
├── lib/
│   ├── db/                         Drizzle client + schema + migrate script
│   └── env/                        Zod-validated env vars
└── components/
    └── ui/                         shadcn/ui components (none yet)

drizzle/                            generated SQL migrations
```

## What's intentionally missing

- Auth (Auth.js v5 planned)
- Any business tables (Drizzle schema is empty)
- Background jobs (Inngest planned)
- shadcn/ui components
- Production deploy config (Vercel)

These will land via feature epics — see Confluence and Jira.
