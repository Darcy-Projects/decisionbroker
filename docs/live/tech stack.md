# DecisionBroker — Tech Stack (Live)

> Living document. Keep this current as the stack evolves. This is the
> authoritative reference for how the project is built and deployed.

_Last updated: 2026-06-13_

## Overview

DecisionBroker is a Next.js web application hosted on Vercel, with its domain
registered and DNS-managed at Cloudflare, and a PostgreSQL backend accessed via
Drizzle ORM.

## Application

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router) | Server-rendered; `src/` directory; `@/*` import alias |
| UI | **React 19** | |
| Styling | **Tailwind CSS 4** | via `@tailwindcss/postcss` |
| Language | **TypeScript 5** | strict mode |
| Lint | **ESLint 9** | `eslint-config-next` |

Scaffolded with `create-next-app` (replaced an earlier Cloudflare Workers /
OpenNext starter — see Guiding Principles for why we left Cloudflare hosting).

## Hosting & Deployment

- **Host:** Vercel (native Next.js runtime — any Postgres driver works).
- **CI/CD:** GitHub integration. A commit appearing on **`main` on GitHub**
  (push, web edit, or merged PR) triggers an automatic **production** deploy.
  Local commits deploy only once pushed.
- **Previews:** commits on any non-`main` branch get an isolated **preview
  deployment** with its own URL; production is untouched until merge.
- **Failed builds are not promoted** — the last good deployment keeps serving.
- **Convention:** do larger/riskier work (e.g. schema changes) on a branch and
  review the preview before merging to `main`.

## Domain & DNS

"Option A": registration + DNS stay at **Cloudflare**; hosting + SSL on
**Vercel**. (Cloudflare Registrar locks nameservers to Cloudflare, so we point
DNS at Vercel rather than moving nameservers.)

- **Domain:** `decisionbroker.com` (singular — not "decisionbrokers").
- **Cloudflare DNS records** (both **DNS only / grey cloud**, unproxied — required
  so Vercel handles SSL/CDN):
  - `A` `@` → `216.198.79.1` (Vercel's apex IP)
  - `CNAME` `www` → `d79353046e343676.vercel-dns-017.com`
- `www` is primary; the apex 308-redirects to it. SSL is auto-issued by Vercel.

## Database

| Concern | Choice |
| --- | --- |
| Engine | **PostgreSQL 17** |
| ORM / query | **Drizzle ORM** |
| Driver | **postgres-js** (`drizzle-orm/postgres-js`) with a standard `DATABASE_URL` |
| Dev/test DB | **Local Docker Postgres** (`docker-compose.yml`, pinned `postgres:17`) |
| Deployed DB | **Neon** (serverless Postgres) — _to be provisioned_ |

The driver and connection string are deliberately **standard Postgres** (not
Neon's proprietary HTTP driver) so the database is portable. Switching between
local Docker, Neon, and a future self-hosted Postgres is just changing
`DATABASE_URL`. The client sets `prepare: false` for compatibility with
transaction-mode poolers (Neon's pooled endpoint / PgBouncer).

### Code layout

- `docker-compose.yml` — local Postgres service.
- `drizzle.config.ts` — drizzle-kit config (loads `.env.local`).
- `src/db/schema.ts` — table definitions.
- `src/db/index.ts` — singleton Drizzle client.
- `drizzle/` — generated SQL migrations (committed, versioned).

### Local dev workflow

```bash
npm run db:up        # start local Postgres (Docker)
# edit src/db/schema.ts
npm run db:push      # rapid iteration: apply schema directly (no migration file)
npm run db:studio    # browse data in a GUI
# when the schema stabilizes:
npm run db:generate  # create a versioned SQL migration -> commit it
npm run db:migrate   # apply pending migrations
npm run db:down      # stop Postgres (add `-v` via docker compose to wipe data)
```

Iterate against local Docker (instant, offline); generated migrations apply
identically to Neon on deploy and to self-hosted Postgres later.

## File storage

Most application data is **files**, stored in **Cloudflare R2** (private bucket;
S3-compatible; zero egress; portable) — _R2 not yet provisioned_. Postgres holds
only file **metadata + ownership** (the `files` table), never the bytes.

- **Per-user security (app-layer, portable):** the bucket is private; each file
  row has `owner_user_id`. On every download the server checks ownership against
  the authenticated user (WorkOS, later) and only then issues a short-lived
  **presigned URL** (or streams the bytes). User B can never obtain a URL to user
  A's file. This logic lives in our code, so it works against R2, S3, or
  self-hosted MinIO unchanged.
- **Lifecycle / archival:** each file moves through a workflow and ends
  `archived` (`files.status`). Most files will end up archived, so archived
  objects move to R2 **Infrequent Access** (`files.storage_class = infrequent`)
  — cheaper storage, slower / pay-per-retrieval access, still online. The app
  flips the class when the workflow archives the file.

> Broader relational model (projects, requests, items, files, …) is **still to be
> designed** — see `docs/live/data-model.md` once it exists. `files` will likely
> gain foreign keys into that model.

## Environment variables

| Variable | Where | Value |
| --- | --- | --- |
| `DATABASE_URL` | `.env.local` (gitignored) | local Docker: `postgresql://postgres:postgres@localhost:5432/decisionbroker` |
| `DATABASE_URL` | Vercel env vars | Neon **pooled** connection string (`...?sslmode=require`) |

`.env.example` documents the variable. `.env.local` is read by both Next.js
(runtime) and drizzle-kit (via dotenv in `drizzle.config.ts`).

## Guiding principles & future direction

- **Portability / no vendor lock-in.** Prefer standard Postgres, standard
  drivers, plain-SQL migrations. The project may move to a **self-managed /
  self-hosted Postgres** if it succeeds, so avoid host-proprietary features
  (Neon Auth, app-level dependence on Neon branching, etc.).
- **Auth:** planned via **WorkOS** (external) — not yet implemented, and
  deliberately not a DB-bundled auth.
- **Stage:** experimental. Optimizing for fast iteration and a clean exit path
  over premature scale.

## Current status

- ✅ Live at `https://decisionbroker.com` with auto-SSL ("Coming Soon" page).
- ✅ Push-to-`main` → Vercel production deploy.
- ✅ Drizzle + Postgres set up and verified locally (branch
  `feat/postgres-drizzle`, not yet merged to `main`).
- ✅ `files` table (UUID PK, `owner_user_id`, workflow `status`, `storage_class`,
  archival fields) created and verified locally.
- ▶️ Pending: provision Neon + set `DATABASE_URL` in Vercel; prove prod
  read/write; merge the DB branch.
- ▶️ To design: full relational model (projects, requests, items, files, …) and
  Cloudflare R2 file storage + per-user upload/download.
