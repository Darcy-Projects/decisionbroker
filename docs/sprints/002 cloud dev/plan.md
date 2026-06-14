# Sprint 002 — Cloud Dev (Anthropic-hosted Claude Code agents)

_Last updated: 2026-06-13_

## Objective

Be able to run **Anthropic-hosted Claude Code cloud agents** against this repo —
autonomous sessions launched from claude.ai/code (or the web/desktop/CLI) that
clone DecisionBroker into a sandbox, build it, and can do real dev work
(data-model design, table creation, app code) **without touching production**.

This is _not_ GitHub Actions (the `@claude` PR bot) and _not_ scheduled
routines — those are separate tracks we can add later.

## Decisions

- **Flavour: Anthropic-hosted cloud agents (Claude Code on the web).** Sessions
  run in a managed sandbox (~4 vCPU / 16 GB / 30 GB disk) with Node 22,
  PostgreSQL, Docker, git, and the package managers pre-installed.
- **Cloud DB strategy: sandbox-local Postgres.** When an agent needs a database
  it spins up a throwaway Postgres **inside its own sandbox** (reusing our
  existing `docker compose` / `postgres:17`). Rationale:
  - **Zero secrets** — no `DATABASE_URL` to store in the cloud environment.
  - **Prod Neon is never exposed** to an autonomous agent.
  - **Fully isolated** — each session gets a clean DB; nothing to corrupt.
  - Cost: data does not persist between sessions, which is fine for schema
    design and migration testing (migrations are committed SQL anyway).
  - A **Neon dev branch** can be added later if agents ever need shared/persistent
    cloud data; deliberately deferred.
- **Config lives in the repo, version-controlled.** Prefer a committed
  `.claude/settings.json` `SessionStart` hook (portable, reviewable) over
  configuring setup in the web UI where possible. The hook is **guarded to run
  only in the cloud** (`CLAUDE_CODE_REMOTE=true`) so it never disturbs the
  local dev machine (which already has its own `.env.local` and container).
- **No prod credentials in the cloud environment.** The Vercel-held pooled Neon
  string and the direct string in `.env.production.local` stay off the sandbox.

## What the sandbox already provides (no setup needed)

- Node.js 22, npm/yarn/pnpm
- PostgreSQL + Docker (so `npm run db:up` works as-is)
- git, with GitHub auth handled transparently by the cloud's GitHub proxy
- Network egress (default "Trusted" allowlist covers npm registry, GitHub, etc.)

## What the sandbox is missing (the gap to close)

- The gitignored `.env.local` is **not** in the repo, so neither `drizzle.config.ts`
  (reads `.env.local`) nor the app (`process.env.DATABASE_URL`) has a connection
  string on a fresh clone.
- `node_modules` is not present on a fresh clone.
- No Postgres is running until something starts it.

The `SessionStart` bootstrap below closes all three.

## Path forward

### Step 1 — Connect GitHub (you, one-time, interactive)

Either:
- Visit **https://claude.ai/code**, start a New session, pick this repo, and
  authorize the **Claude GitHub App**; **or**
- Run **`/web-setup`** in the local terminal once to sync the `gh` CLI token to
  the Claude account.

Plan requirement: Claude Code on the web is available on **Pro / Max / Team /
Enterprise**. Cloud sessions draw down standard subscription usage (no separate
VM charge). If the org ever enables **API IP allowlisting**, cloud sessions
break — contact Anthropic support to exempt hosted services.

### Step 2 — Commit the cloud bootstrap (me, in-repo)

Add a committed **`.claude/settings.json`** with a `SessionStart` hook that runs
**only in the cloud** and: installs deps → starts Postgres → writes a sandbox
`.env.local` → applies migrations. Proposed contents:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/cloud-bootstrap.sh"
          }
        ]
      }
    ]
  }
}
```

And **`.claude/cloud-bootstrap.sh`** (guarded so it is a no-op locally):

```bash
#!/usr/bin/env bash
# Bootstrap an Anthropic cloud sandbox for DecisionBroker.
# No-op outside the cloud so it never touches the local dev machine.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

echo "[cloud-bootstrap] installing dependencies…"
npm install

echo "[cloud-bootstrap] starting local Postgres (docker compose)…"
npm run db:up

# Provide the standard local connection string the same way .env.local does.
# Safe to write here because this branch only runs in the cloud sandbox.
if [ ! -f .env.local ]; then
  echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/decisionbroker"' > .env.local
fi

echo "[cloud-bootstrap] waiting for Postgres to accept connections…"
for i in $(seq 1 30); do
  if docker exec decisionbroker-postgres pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[cloud-bootstrap] applying migrations…"
npm run db:migrate

echo "[cloud-bootstrap] ready."
```

> Note: this hook also fires on the **local** machine, but the
> `CLAUDE_CODE_REMOTE` guard makes it exit immediately there — your local
> `.env.local` and running container are never modified.

### Step 3 — (Optional) Pin the cloud environment in the web UI

The repo hook handles project setup. Only touch the web "Setup script" /
environment settings if a **system package** is ever needed beyond the
pre-installed set. With the sandbox-local DB choice, **no env vars and no
network-allowlist changes are required**.

### Step 4 — Verify

Launch a cloud session and confirm the bootstrap worked, e.g. ask the agent to:
- `npm run dev` and hit the app, and
- run a Drizzle round-trip (`db:studio` / a `select now()`),
then have it open a small PR (e.g. a docs tweak) to prove the
clone → build → DB → commit → PR loop end-to-end.

### Step 5 — First real cloud task

Hand the agent the current top-of-backlog item: **draft
`docs/live/data-model.md`** (projects → requests → items → files ERD) — a
high-value, low-risk task that exercises the sandbox DB without prod exposure.

## Out of scope (future sprints)

- **GitHub Actions `@claude` bot** — PR review / issue-to-PR. Needs
  `.github/workflows/claude.yml` + an `ANTHROPIC_API_KEY` Actions secret.
- **Scheduled routines** — cron-driven cloud agents (`/schedule`).
- **Neon dev branch** — only if agents later need persistent/shared cloud data.

## Status

- ✅ Local dev fully operational (Node 22, deps installed, Docker Postgres 17
  healthy, env files present, `gh` authed, repo synced with `origin/main`).
- ✅ Flavour + DB strategy decided (hosted cloud agents; sandbox-local Postgres).
- ▶️ **NEXT:** Step 1 (connect GitHub) by the user; Step 2 (commit bootstrap)
  ready to apply.
