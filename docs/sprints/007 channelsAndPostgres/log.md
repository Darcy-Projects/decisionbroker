# Sprint 007 — Channels & Postgres · Log

What this sprint shipped. The plan/decisions/acceptance live in
[`specifications.md`](./specifications.md).

## Outcome

A **Claude Code channel** now bridges a session to DecisionBroker. Claude calls
an **`ask`** tool with free-text questions; each becomes a **decision** on a
human-chosen board, and the tool **blocks until every question is answered**,
then returns the answers so the session continues. The bridge talks to
DecisionBroker **only through the published HTTP API** — never the database.
**No schema change** was needed (sprint 006 already shipped `actors.kind='agent'`,
`sessions`, and `decisions.session_id` / `questioner_id`).

## Delivered

### HTTP API (interface tier)
- **`GET /api/decisions/[id]`** (`src/app/api/decisions/[id]/route.ts`) — the
  channel's poll endpoint; returns the hydrated decision view model (404 if
  missing) via the existing `get-decision` + `toDecisionView`.
- **`POST /api/sessions`** (`src/app/api/sessions/route.ts`) — ensure the agent
  actor + a session row for a launch; returns `{ sessionId, agentId }`.
- **`POST /api/decisions`** (extended, backward-compatible) — accepts an optional
  `sessionId`; when present the questioner becomes the session's agent and the
  decision links to the session. The Add-dialog path (no `sessionId`) is
  unchanged.
- **`PATCH /api/boards/[id]`** (`src/app/api/boards/[id]/route.ts`) — rename a
  board (the Edit-board popup).
- **`api.ts`**: `sessionId` added to `createDecisionSchema`; new
  `createSessionSchema` + `updateBoardSchema`; `SessionNotFoundError` → 404.

### Application + ports + adapters (core / data tiers)
- **`ensure-session.ts`** use-case (+ `CLAUDE_CODE_AGENT_NAME`,
  `SessionNotFoundError`): find-or-creates the singleton **Claude Code** agent and
  creates a session row.
- **`update-board.ts`** use-case: rename only this sprint (reuses
  `BoardNotFoundError`).
- **`create-decision.ts`**: now resolves the questioner from `sessionId` (→ the
  session's agent) when present, else the dev current user; opening event reads
  e.g. `Question raised by Claude Code`.
- **Ports**: new `session-repository.ts` (`create`, `findById`);
  `actor-repository` gains `findOrCreateAgent(displayName)`; `board-repository`
  gains `rename(id, name)`.
- **Adapters**: new `db/drizzle/session-repository.ts`;
  `actor-repository.findOrCreateAgent` (find agent by kind+name, else insert);
  `board-repository.rename`.
- **Composition root** (`container.ts`): wires `sessionRepository`,
  `ensureSession`, `updateBoard`, and passes `sessions` into `createDecision`.

### Web UI — Edit board
- **`EditBoardDialog.tsx`** — popup that renames the board and shows the **board
  id** (`boards.id`, already exposed as the view model's `key`) with a copy
  button and the hint *"Paste this into Claude Code when it asks which board to
  use."*
- **`Sidebar.tsx`** — right-click a board → a context dropdown with **"Edit
  board"** (closes on outside click / Escape).
- **`InboxShell.tsx`** — boards lifted into state so a rename reflects
  immediately; `handleRenameBoard` PATCHes `/api/boards/[id]`.

### Channel — `/channel/`
- **`server.ts`** — a Bun + `@modelcontextprotocol/sdk` MCP server over stdio,
  declaring `capabilities.experimental['claude/channel']` + `tools` and an
  `instructions` string. The **`ask`** tool: lazily ensures one session per
  process, posts each question as a decision, long-polls
  `GET /api/decisions/:id` every ~3s until **all** are answered (partial answers
  don't return), emits a `notifications/claude/channel` visibility notification,
  and returns `{ answers: [{question, answer}, …] }`. Clear tool errors on bad
  board id / unreachable API / vanished decision.
- **Config (env)**: `DECISIONBROKER_API_URL` (default `https://decisionbroker.com`),
  `DECISIONBROKER_POLL_INTERVAL_MS` (3000), `DECISIONBROKER_TIMEOUT_MS` (0 = wait).
- **Plugin packaging**: `.claude-plugin/plugin.json` + a one-plugin
  `.claude-plugin/marketplace.json`, `.mcp.json` (spawns `bun start`),
  `package.json`, `tsconfig.json`, and a `README.md` with the end-to-end
  walkthrough and the `--dangerously-load-development-channels` launch.

## Verification

- `npm run lint` → 0 errors (1 pre-existing `<img>` warning in `Sidebar`).
- `npx tsc --noEmit` (web app) → clean.
- Channel `bunx tsc --noEmit` → clean; MCP stdio handshake smoke-tested
  (`initialize` + `tools/list` return the channel capability and the `ask` tool).

## Out of scope (deferred)
Structured questions, permission relay (`claude/channel/permission`),
board creation from the channel, real WorkOS identity, the official channel
allowlist. See specifications §3 / §12.
