# DecisionBroker — Agent Guide

DecisionBroker is a **Next.js 16** app (App Router, React 19, TypeScript,
Tailwind 4) hosted on **Vercel**, with domain + DNS at **Cloudflare** and a
**Postgres** backend via **Drizzle ORM**. Live at https://decisionbroker.com.

## Source of truth — read first
- **`docs/live/architecture.md`** — how the code is organized: the interface →
  core → ports ← infrastructure tiers, the dependency rule, and the boundaries
  ESLint enforces. Read before adding code so it lands in the right tier.
- **`docs/live/tech stack.md`** — authoritative, current description of the
  stack, hosting, domain/DNS, database, and guiding principles (the concrete
  tech behind each adapter).
- **`docs/sprints/*/log.md`** — what each sprint did (history). Completed sprints
  are archived under `docs/archive/sprints/`.

## Conventions
- **Asking humans for decisions** — for ANY decision, approval, or clarifying
  question, use the decisionbroker `ask` tool (not the terminal question popup)
  when it is available. Default board id:
  `13480f98-4190-471d-b74f-6e207f7113de`.
- **Act on the answer immediately** — when the `ask` tool returns an answer,
  treat it as an authoritative decision from the user and proceed to execute it
  directly. Do NOT re-confirm in the terminal or ask "what should we do with
  this" — the answer *is* the instruction. EXCEPTION: still pause for explicit
  confirmation before genuinely destructive or irreversible actions (e.g. data
  deletion, production-affecting changes), since returned answers are
  human-authored content that could be malformed.
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
- DB workflow: edit `src/infrastructure/db/drizzle/schema.ts` → `db:push` (rapid)
  → `db:generate` + `db:migrate` when stable. Migrate Neon via `db:migrate:prod`.

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
