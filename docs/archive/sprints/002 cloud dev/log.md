# Sprint 002 — Cloud Dev Log

_Last updated: 2026-06-14_

## Objective

Be able to run **Anthropic-hosted Claude Code cloud agents** against this repo —
autonomous sessions launched from claude.ai/code that clone DecisionBroker into a
managed sandbox, build it, and do real dev work (data-model design, table
creation, app code) **without touching production**. See `plan.md` for the full
rationale and decisions.

## Architecture decisions

- **Flavour: Anthropic-hosted cloud agents (Claude Code on the web).** Sessions
  run in a managed sandbox (~4 vCPU / 16 GB / 30 GB disk) with Node 22,
  PostgreSQL, Docker, git, and package managers pre-installed.
- **Cloud DB strategy: sandbox-local Postgres.** When an agent needs a database it
  spins up a throwaway `postgres:17` **inside its own sandbox** (reusing our
  existing `docker compose`). Rationale: **zero secrets** (no production
  `DATABASE_URL` stored in the cloud), **prod Neon never exposed**, and **full
  isolation** (each session gets a clean DB). Data does not persist between
  sessions — fine for schema design and migration testing. A Neon dev branch can
  be added later if shared/persistent cloud data is ever needed (deferred).
- **Config lives in the repo, version-controlled.** A committed
  `.claude/settings.json` `SessionStart` hook runs the bootstrap — portable and
  reviewable, rather than configured in the web UI.
- **Cloud-only guard.** The hook is guarded with `CLAUDE_CODE_REMOTE=true` so it
  is a no-op on the local dev machine and never disturbs the local `.env.local`
  or running container.
- **Non-secret `.env.local` generated at runtime.** The app and Drizzle read
  `process.env.DATABASE_URL`, so the bootstrap *writes* a `.env.local` pointing at
  the sandbox-local container (`postgresql://postgres:postgres@localhost:5432/decisionbroker`).
  This is not a secret (hardcoded localhost + default dev credentials) and is
  written rather than committed so it never lands on the local machine.

## What was done

### 1. Cloud bootstrap committed
- `.claude/settings.json` — `SessionStart` hook (`matcher: startup|resume`) that
  runs `bash .claude/cloud-bootstrap.sh`.
- `.claude/cloud-bootstrap.sh` — guarded (`CLAUDE_CODE_REMOTE=true` or exit 0);
  installs deps → starts Postgres → writes the sandbox `.env.local` → applies
  migrations.
- Merged via PR #1 (`feat/cloud-dev-bootstrap`).

### 2. Step 4 verification (first cloud session)
- Ran a real cloud session: clone → `npm install` → Docker Postgres 17 →
  migrations → Drizzle round-trip (`select now()`, `files` table) → `npm run
  build` → docs PR. Full clone → build → DB → commit → PR loop confirmed.
- Marked Step 4 complete in `plan.md` via PR #2.

### 3. Docker-daemon bug found + fixed
- Verification caught that the sandbox starts with the **Docker daemon stopped**
  (no `/var/run/docker.sock`), so `db:up` failed under `set -e` and the bootstrap
  bailed before writing `.env.local` / migrating (the first agent finished it
  manually).
- Fixed: `cloud-bootstrap.sh` now detects a stopped daemon (`docker info`), starts
  it (`sudo service docker start`, falling back to `sudo dockerd`), and waits for
  it before `db:up`.
- Merged via PR #3 (`fix/cloud-bootstrap-docker-daemon`).

### 4. Re-verification (clean pass)
- Ran a fresh cloud session against the hardened bootstrap to confirm the
  docker-daemon fix holds and nothing else regressed. **All five steps passed
  with no manual workarounds**, and the previously-caught daemon bug did not
  recur. Opened PR #4 as the end-to-end proof. Transcript below.

## Re-verification transcript (2026-06-14)

The cloud agent worked through the checklist and reported:

> **The SessionStart hook ran automatically on startup** (output present at
> session start, ending cleanly at `[cloud-bootstrap] ready.`). No manual
> workarounds were needed at any step.
>
> **Step 1 — Bootstrap sanity ✅ PASS**
> - `CLAUDE_CODE_REMOTE=true` ✅
> - `node_modules` exists (304 entries) ✅
> - Docker daemon running — `Docker Engine - Community Version 29.3.1` ✅ (the
>   hook's `docker info` check fired and it started the daemon:
>   `[cloud-bootstrap] docker daemon not running — starting it…`)
> - Postgres container up — `decisionbroker-postgres` `Up (healthy)`,
>   `5432->5432`; `pg_isready` → `accepting connections` ✅
> - `.env.local` present with
>   `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/decisionbroker"` ✅
>
> **Step 2 — DB round-trip ✅ PASS**
> - `select now()` → `2026-06-14 03:39:57.610283+00` ✅
> - `\dt` and `information_schema.tables` both show the `files` table ✅
>
> **Step 3 — Build ✅ PASS**
> - `npm run build` → `✓ Compiled successfully in 6.8s`, TypeScript finished
>   clean, 4/4 static pages generated. Next.js 16.2.9 (Turbopack).
>
> **Step 4 — Dev server ✅ PASS**
> - `npm run dev` → `✓ Ready in 432ms`; `curl http://localhost:3000` → **HTTP
>   200**, title `DecisionBroker — Coming Soon`. Stopped cleanly afterward (port
>   now returns `000`/connection refused).
>
> **Step 5 — PR loop ✅ PASS**
> - Appended a dated re-verification line under **Status** in `plan.md`,
>   committed, pushed to `claude/exciting-curie-wywh96`, opened PR.
> - **PR: https://github.com/Darcy-Projects/decisionbroker/pull/4**
>
> **PASS/FAIL summary**
>
> | Step | Result |
> |------|--------|
> | 1. Bootstrap sanity | ✅ PASS |
> | 2. DB round-trip | ✅ PASS |
> | 3. Build | ✅ PASS |
> | 4. Dev server | ✅ PASS |
> | 5. PR loop | ✅ PASS |
>
> **Anything that needed fixing:** Nothing. No regressions, no manual
> workarounds. The previously-caught "Docker daemon stopped on fresh sandbox" bug
> did **not** recur — the `cloud-bootstrap.sh` fix (start + wait for `dockerd`
> before `db:up`) worked automatically. The committed script matches what's
> documented in the plan.
>
> One non-blocking observation (not a bootstrap failure): `npm install` reported
> `6 vulnerabilities (4 moderate, 2 high)` from `npm audit` — a dependency-hygiene
> item, unrelated to the bootstrap's correctness.

## Current state

- ✅ Cloud bootstrap committed (`.claude/settings.json` + `.claude/cloud-bootstrap.sh`).
- ✅ Sandbox-local Postgres strategy working; no prod credentials in the cloud.
- ✅ Docker-daemon-stopped bug fixed and confirmed non-recurring on re-test.
- ✅ Full clone → build → DB → commit → PR loop verified twice (PRs #2/#4).
- ▶️ Cloud-dev setup is **closed**; ready for the first real cloud task.

## Key files

- `.claude/settings.json` — `SessionStart` hook.
- `.claude/cloud-bootstrap.sh` — guarded bootstrap (deps → docker daemon →
  Postgres → `.env.local` → migrations).

## Follow-ups

- **First real cloud task** — draft `docs/live/data-model.md` (projects →
  requests → items → files ERD); exercises the sandbox DB without prod exposure.
- **Dependency hygiene** (non-blocking) — `npm audit` reports 6 vulnerabilities
  (4 moderate, 2 high); address separately from the bootstrap.

## Out of scope (future sprints)

- **GitHub Actions `@claude` bot** — needs `.github/workflows/claude.yml` + an
  `ANTHROPIC_API_KEY` Actions secret.
- **Scheduled routines** — cron-driven cloud agents (`/schedule`).
- **Neon dev branch** — only if agents later need persistent/shared cloud data.
