# Sprint 001 — Postgres Setup Log

_Last updated: 2026-06-13_

## Objective

Be able to **read and write to Postgres in production** — working both locally
(for development) and on the cloud (the live deployment).

## Architecture decisions

- **ORM / driver:** **Drizzle ORM** + **postgres-js** using a standard
  `DATABASE_URL`. Deliberately the standard Postgres driver/connection string
  (not a host-specific HTTP driver) so the database stays portable.
- **Two environments, one env var:** **local Docker Postgres** for dev/test,
  **Neon** for the cloud. Switching is just changing `DATABASE_URL`.
- **Host: Neon, not Supabase.** Reasons: portability / no lock-in (the project
  may move to self-hosted Postgres later); auth will be **WorkOS** (external),
  which neutralises Supabase's main draw (bundled auth/storage RLS); and Neon's
  scale-to-zero suits a storage-heavy, low-traffic-initially profile. Storage
  pricing (2026): Neon $0.35/GB-mo + $5 base; Supabase $0.125/GB-mo + $25 base —
  Neon cheaper overall below ~80 GB of DB data given low traffic.
- **Neon Auth: disabled.** Not needed; WorkOS owns auth. Avoids a lock-in
  surface.
- **Files go to object storage, not Postgres.** Most app data is files →
  **Cloudflare R2** (private bucket, S3-compatible, zero egress, portable);
  Postgres holds only metadata + ownership. _R2 not provisioned yet._
- **Per-user file security (app-layer):** each `files` row has `owner_user_id`;
  the server checks ownership against the authenticated user (WorkOS) before
  issuing a short-lived presigned URL. Portable across R2/S3/self-hosted.
- **Archival / lifecycle:** files move through a workflow ending `archived`.
  Since most files end archived, archived objects move to R2 **Infrequent
  Access** (cheaper, slower, still online). Modeled as `files.status` +
  `files.storage_class`.

## What was done

### 1. Drizzle + local Postgres
- Installed `drizzle-orm`, `postgres`, `drizzle-kit`, `dotenv`.
- `docker-compose.yml` — local Postgres pinned to `postgres:17` (matches Neon).
- `drizzle.config.ts`, `src/db/schema.ts`, `src/db/index.ts` (singleton client).
- `db:*` npm scripts: `up`, `down`, `push`, `generate`, `migrate`, `studio`.
- `.env.local` (gitignored) for the local connection; `.env.example` documents it.
- Verified end-to-end locally (migrate + insert/select round-trip).
- Commit: `6878ea2`.

### 2. `files` table
- Replaced the placeholder `decisions` table with **`files`**: `uuid` PK,
  `owner_user_id`, unique `object_key`, name/type/size, `status` enum
  (`active|archived`), `storage_class` enum (`standard|infrequent`),
  `archived_at`, timestamps; indexes for per-user and active-file lookups.
- Regenerated the initial migration. Verified table + enums locally.
- Commit: `ce653a0`.

### 3. Production wiring
- `src/db/index.ts` → lazy `getDb()` so `next build` never needs `DATABASE_URL`.
- `db:migrate:prod` (via `dotenv-cli`) migrates Neon using the **direct** string
  in `.env.production.local` (gitignored).
- Temporary `GET /api/health/db` — read (`select now()`) + write (insert/delete)
  to prove the deployed app can reach Postgres.
- Commit: `9ac42d4`.

### 4. Neon provisioned + verified
- Created the Neon project (Postgres 17; Neon Auth left off). Pooled connection
  string set as `DATABASE_URL` in Vercel; direct string in `.env.production.local`.
- Ran `db:migrate:prod` → `files` table + enums confirmed present in Neon.
- Merged `feat/postgres-drizzle` → `main` (fast-forward).
- **Verified production read/write:** `https://decisionbroker.com/api/health/db`
  returned `{ ok: true, ... }` — real read + write against Neon from a Vercel
  function (first call ~1.5 s incl. Neon scale-to-zero cold start).
- Removed the temporary endpoint (confirmed 404). Commit: `b024f71`.

## Current state

- ✅ Local Docker Postgres for dev; **Neon** for production — both migrated.
- ✅ `files` table live in both.
- ✅ Deployed app on `decisionbroker.com` reads + writes Neon (verified).
- ✅ `feat/postgres-drizzle` merged to `main` and deleted.
- ▶️ Health endpoint removed; DB wiring (client, migrations, scripts) remains.

## Key files & commands

- `docker-compose.yml`, `drizzle.config.ts`, `src/db/{schema,index}.ts`, `drizzle/`.
- Local: `npm run db:up`, `db:push` (rapid), `db:generate` + `db:migrate`, `db:studio`.
- Neon: `npm run db:migrate:prod` (uses `.env.production.local` direct string).
- Connection split: Vercel `DATABASE_URL` = **pooled**; migrations = **direct**.

## Next steps

- **Data model design** — projects, requests, items, files, … Draft
  `docs/live/data-model.md` (entities + ERD) before writing tables. `files` will
  gain foreign keys into that model.
- **Cloudflare R2** — provision a private bucket; build upload/download with the
  ownership-check + presigned-URL flow; wire archival to Infrequent Access.
- **WorkOS** — external auth to supply the real user identity for per-user access.
