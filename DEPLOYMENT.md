# Deploying MindCross to Vercel

MindCross is a Next.js 16 app that needs a Postgres database. The easiest
production setup is **Vercel + Neon** (serverless Postgres). This guide gets you
from the GitHub repo to a live deployment.

Everything here is free-tier friendly.

---

## 1. Create a Neon Postgres database

**Easiest — via Vercel (recommended):**

1. In Vercel, open your project (or the **Storage** tab on the dashboard) →
   **Create Database** → **Neon** (Serverless Postgres) → follow the prompts.
2. Vercel automatically adds the connection env vars to the project, including
   `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct). You don't need
   to copy anything by hand.

**Or — directly at [neon.tech](https://neon.tech):**

1. Create a project → copy the **Pooled** connection string (it contains
   `-pooler`). You'll paste it as `DATABASE_URL` in step 3.
2. Also copy the plain (direct) connection string for migrations → set it as
   `DATABASE_URL_UNPOOLED`.

Neon supports the `citext` and `pg_trgm` extensions this app uses out of the box.

---

## 2. Import the repo into Vercel

1. **Add New… → Project** → import `Kaloyan9905/mindcross-alpha`.
2. Framework preset: **Next.js** (auto-detected). Package manager: **pnpm**
   (auto-detected from the lockfile).
3. Leave the **Build Command** as default — the project ships a `vercel-build`
   script that **runs database migrations and then builds**, so your schema is
   created/updated on every deploy (migrations are idempotent).

> The local Docker setup (`docker-compose.yml`, `Dockerfile`, `output:
> "standalone"`) is ignored on Vercel — Vercel builds Next.js natively.

---

## 3. Environment variables

In **Project → Settings → Environment Variables**, set:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon **pooled** URL | Auto-set by the Neon integration. |
| `DATABASE_URL_UNPOOLED` | Neon **direct** URL | Auto-set by the integration; used only for migrations. Optional. |
| `AUTH_SECRET` | a 32-byte random string | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_TRUST_HOST` | `true` | Lets Auth.js trust the deployment host. |
| `AUTH_URL` | `https://<your-app>.vercel.app` | Recommended on your production domain. Optional for preview URLs (cookies are still Secure on Vercel). |
| `CRON_SECRET` | a 32-byte random string | Guards `/api/cron/reminders`; Vercel sends it automatically to the cron. |
| `MEETING_TURN_URL` | `turn:<host>:3478` | Optional. TURN relay for the in-app video call (see §7). Omit for STUN-only. |
| `MEETING_TURN_SECRET` | coturn `static-auth-secret` | Optional. The app mints short-lived TURN credentials from it. |

`NODE_ENV=production` is set by Vercel automatically — don't add it.

---

## 4. Deploy

Click **Deploy**. The `vercel-build` step migrates the database, then builds.
When it's done you'll have a live URL. After the first deploy, set `AUTH_URL` to
that URL (or your custom domain) and redeploy.

---

## 5. Seed demo data + create an admin (one-time)

The demo therapists, availability slots, and logins are created by a seed
script. Passwords are hashed in Node, so run these from your machine pointed at
the Neon database (not the Neon SQL editor):

```bash
# 1. Put your Neon connection string in a local .env (gitignored):
echo 'DATABASE_URL=postgres://...your-neon-pooled-url...' > .env

# 2. Install deps and seed:
pnpm install
pnpm db:seed       # therapists, slots, demo therapist logins
pnpm admin:create  # creates admin@mindcross.local / Admin12345!

# 3. (optional) remove the local .env when done.
```

(If migrations didn't run during the build for any reason, `pnpm db:migrate`
applies them.)

### Demo logins

- **Admin:** `admin@mindcross.local` / `Admin12345!`
- **Therapists:** `olena.kovalenko@example.com` or `dmytro.shevchenko@example.com` / `Therapist12345!`
- **Clients:** register your own at `/register`.

---

## 6. Notes

- **Reminder cron:** `vercel.json` schedules a daily scan of `/api/cron/reminders`
  (Vercel Hobby allows daily crons; raise the frequency on Pro). It's authed via
  `CRON_SECRET`, which Vercel injects automatically.
- **Crisis support** (`/crisis-support`) and the **safety plan** are duty-of-care
  features — the helpline numbers are a curated starting point; review them for
  your launch regions.
- **Local development** is unchanged: `docker compose up -d` for Postgres, then
  `pnpm dev`. The DB driver enables TLS automatically for non-local hosts, so the
  same code talks to both local Docker and Neon.

---

## 7. Optional: reliable video calls behind strict firewalls (TURN)

The in-app session room (`/session/[bookingId]`) is **peer-to-peer WebRTC** and
works out of the box using free public STUN — no config, no account. But ~10–20%
of users behind **symmetric NAT / CGNAT / locked-down firewalls** (common on
mobile and shelter/campus networks) can't connect peer-to-peer and need a **TURN
relay**. There is no free *no-account* public TURN anymore, so the free path is
to **self-host [coturn](https://github.com/coturn/coturn)** on any small server.

Media stays end-to-end encrypted (DTLS-SRTP) — a TURN relay only forwards
encrypted packets, it can't read them.

**1. Run coturn on a cheap/free VPS** (e.g. Oracle Cloud Always-Free). Open UDP
`3478` and the relay range, and pick a strong secret:

```bash
docker run -d --name coturn --network host coturn/coturn:4.6-alpine \
  --no-cli --use-auth-secret \
  --static-auth-secret="$(openssl rand -base64 32)" \
  --realm=mindcross --listening-port=3478 \
  --min-port=49160 --max-port=49200 \
  --external-ip="$(curl -s ifconfig.me)"
```

**2. Set the env vars** (Vercel project settings, or your host):

```
MEETING_TURN_URL=turn:your-vps-host:3478
MEETING_TURN_SECRET=<the same static-auth-secret>
```

The app mints short-lived HMAC credentials from `MEETING_TURN_SECRET` per join
(coturn's REST scheme), so no per-user TURN account is needed and leaked
credentials expire quickly. For production, also add `--tls-listening-port=5349`
with a cert so TURN works over TCP/443-style ports through hostile firewalls.

The local `docker compose` setup already includes a `coturn` service wired this
way for the Docker deployment.
