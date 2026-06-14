# Sprint 003 — Directory Structure & Architecture Log

_Last updated: 2026-06-13_

## Objective

Restructure the project around a **Ports & Adapters (hexagonal)** layering so it
can eventually serve iOS, Android, CLI, and a web API through **one shared middle
tier**, with a **swappable data tier** (different DB / file hosts, potentially
per customer) — and **no interface layer ever touching the data tier directly**.
Document the architecture and cleanly separate `architecture.md` from
`tech stack.md`. Plan in [`plan.md`](./plan.md).

## What was done

### 1. Layered the codebase (interface → core → infrastructure)
- Created `src/core` (middle tier) and `src/infrastructure` (data tier).
- Moved the DB code into the data tier (history preserved via `git mv`):
  - `src/db/schema.ts` → `src/infrastructure/db/drizzle/schema.ts`
  - `src/db/index.ts` → `src/infrastructure/db/drizzle/client.ts`
  - Updated `drizzle.config.ts` `schema` path.

### 2. Wired one use case end-to-end through the layers
- **Domain** (`core/domain/files/file.ts`): `FileRecord` type + pure, idempotent
  `archive()` rule (archived ⇒ `infrequent` storage class + `archivedAt`).
- **Ports** (`core/ports`): `FileRepository`, `Clock` interfaces.
- **Application** (`core/application/files/archive-file.ts`): `makeArchiveFile`
  use case (orchestrates domain + ports; no HTTP/SQL) + `FileNotFoundError`.
- **Adapters** (`infrastructure`): `DrizzleFileRepository` implements
  `FileRepository` (maps Drizzle row → domain); `SystemClock` implements `Clock`.
- **Composition root** (`infrastructure/config/container.ts`): the single place
  that picks adapters and exposes wired `services`. This is the swap point for
  per-deployment / per-customer hosting.

### 3. Made the boundaries mechanical
- Path aliases: added `@/core/*` and `@/infra/*` (alongside `@/*`).
- `eslint.config.mjs` `no-restricted-imports` rules:
  - interface tier (`src/app/**`) can't import data-tier adapters or raw
    `drizzle-orm`/`postgres` — must go through application services / the
    composition root;
  - core (`src/core/**`) can't import infrastructure, `next`, `react`, or DB libs;
  - infrastructure can't import the interface tier.

### 4. Documentation
- New **`docs/live/architecture.md`** — tiers, dependency rule, ports/adapters
  table, how each client attaches (API = the external contract), directory
  layout, enforcement, swap points, monorepo roadmap.
- **`tech stack.md`** ↔ **`architecture.md`** responsibilities split with a rule
  of thumb (_"if swapping a vendor changes the sentence, it's tech-stack; if it
  survives the swap, it's architecture"_) and reciprocal cross-links.
- Updated `AGENTS.md` (architecture.md added to source-of-truth; DB path) and the
  DB paths in `tech stack.md`.

## Decisions

- **Single Next.js app now, monorepo later.** Adopt the hexagonal _boundaries_
  today inside `src/`; defer the Turborepo/pnpm `apps/` + `packages/` split until
  a second runnable client (CLI/mobile) exists. Folder names map 1:1 to the
  future packages, so graduation is a move, not a rewrite. Rationale: the project
  is experimental / fast-iteration; the monorepo tooling tax isn't earned yet.
- **Composition root lives in `infrastructure/config`** (refines the plan, which
  listed it under `infrastructure/config` as the wiring point). The interface
  tier may import `@/infra/config/**` (the container) but not the data-tier
  adapters (`db`/`storage`/`auth`/`clock`) — keeps the ESLint rule a clean
  deny-list while honoring "no interface → data tier".
- **Mobile/CLI attach via the HTTP API.** Native clients can't import the TS
  core, so the API is the published contract; in-process clients (web UI, future
  Node CLI) call application services directly.

## Verification

- `npm run lint` — clean.
- `npm run build` (Next.js 16, includes TypeScript) — compiled successfully;
  the full interface → core → ports ← infrastructure chain type-checks.

## Current state

- ✅ Three-tier layout in place; DB code moved under the data tier.
- ✅ `archiveFile` wired end-to-end (UI/API → service → domain + port → adapter).
- ✅ Boundaries enforced by ESLint; aliases added.
- ✅ `architecture.md` written; `tech stack.md` responsibilities separated.
- ▶️ Not yet done (future): `FileStorage`/`AuthN` ports + adapters (R2/WorkOS);
  an actual HTTP API route + Zod contracts; the data-model design
  (`docs/live/data-model.md`).

## Next steps

- Resume the backlog item: design `docs/live/data-model.md`
  (projects → requests → items → files).
- Add the `FileStorage` port + R2 adapter and `AuthN` + WorkOS when those land.
- Introduce the first real `src/app/api` route as a thin driving adapter over a
  use case (with Zod validation) to exercise the external-contract path.
