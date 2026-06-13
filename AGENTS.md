# DecisionBroker — Agent Guide

DecisionBroker is a **Next.js 16** app (App Router, React 19, TypeScript,
Tailwind 4) hosted on **Vercel**, with domain + DNS at **Cloudflare** and a
**Postgres** backend via **Drizzle ORM**. Live at https://decisionbroker.com.

## Source of truth — read first
- **`docs/live/tech stack.md`** — authoritative, current description of the
  stack, hosting, domain/DNS, database, and guiding principles.
- **`docs/sprints/*/log.md`** — what each sprint did (history). Completed sprints
  are archived under `docs/archive/sprints/`.

## Conventions
- **Project docs live in `docs/live/`, NOT in agent memory.** Keep them current
  as the source of truth so any agent/teammate can read them.
- **Portability / no vendor lock-in** is a core principle: standard Postgres,
  standard driver (`postgres-js` + a plain `DATABASE_URL`), plain-SQL migrations.
  Avoid host-proprietary features (e.g. Neon Auth). Auth will be **WorkOS**.
- **Deploys:** push to `main` → Vercel **production**. Do larger/riskier work on
  a branch and check the Vercel preview before merging.

## Resuming local development
- `npm run db:up` (local Docker Postgres 17), then `npm run dev` (port 3000).
- Env files are **gitignored** but present on the dev machine — do NOT commit:
  - `.env.local` → local Docker `DATABASE_URL`.
  - `.env.production.local` → **direct** Neon string, used by `db:migrate:prod`.
  - Vercel holds the **pooled** Neon `DATABASE_URL` for the running app.
- DB workflow: edit `src/db/schema.ts` → `db:push` (rapid) → `db:generate` +
  `db:migrate` when stable. Migrate Neon via `db:migrate:prod`.

## Current state & next step
- ✅ Live site ("Coming Soon"); Postgres read/write verified in production (Neon).
- ✅ `files` table (per-user ownership, workflow `status`, archival `storage_class`).
- ▶️ **NEXT:** design the relational model (projects → requests → items → files)
  into `docs/live/data-model.md` before writing tables; then Cloudflare R2 file
  storage + WorkOS auth. Details in `docs/sprints/001 postgres setup/log.md`.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
