# Sprint 007 — Channels & Postgres · Specifications

> Working spec for this sprint. Source prompt: [`prompt.md`](./prompt.md). The
> durable architecture/stack facts this produces will be folded into
> [`docs/live/architecture.md`](../../live/architecture.md) and
> [`docs/live/tech stack.md`](../../live/tech%20stack.md) as the channel lands;
> this file is the plan, the decisions log, and the acceptance criteria.

## 1. Goal

Bridge a **Claude Code session** to DecisionBroker so a human answers the
session's questions in DecisionBroker's nicer, multiplayer UI instead of the
terminal. A Claude Code [**channel**](https://code.claude.com/docs/en/channels)
(a local MCP server) exposes an `ask` tool: Claude posts free-text questions, each
becomes a **decision** on a human-chosen board, and **the tool blocks until every
question it posted is answered**, then returns the answers so the session
continues. Channel **notifications** fire for in-terminal visibility. The channel
ships as an **installable plugin**.

The whole bridge talks to DecisionBroker **only through the published HTTP API** —
never the database directly (per `architecture.md` §4: the HTTP API is the
contract for external clients, and a local MCP server is one).

## 2. How it works (the loop)

```
  Claude Code session                 channel (local MCP server)            DecisionBroker (HTTP API + Postgres)
  ───────────────────                 ──────────────────────────            ───────────────────────────────────
  needs human input
  calls ask(board_id, [q1,q2]) ─────► ensure session  ──POST /api/sessions──► upsert agent actor + sessions row
                                      for each q  ─────POST /api/decisions──► decision (questioner = agent,
                                                                              session_id set) appears on board
                                 ┌──► poll  ───────────GET /api/decisions/:id─► answered? (human answers in the UI)
                                 │    (every few s)
            (turn blocked) ◄─────┤    not all answered yet → keep polling
                                 └──► all answered → emit channel notification (visibility)
  resumes with answers   ◄──────────  ask(...) returns [{question, answer}, …]
```

Key property: the `ask` **tool call** is what hard-blocks the agent — it does not
return until **all** of that call's decisions are answered. The notification is
best-effort visibility only; the tool's return value is the source of truth.

## 3. Scope

**In scope**
- A **channel** MCP server in a new top-level **`/channel/`** folder (Bun +
  `@modelcontextprotocol/sdk`), packaged as an installable **plugin**. Exposes the
  `ask` tool, long-polls for answers, blocks until all are answered, emits a
  notification when they land.
- **HTTP API additions** to the existing Next.js app:
  - `POST /api/sessions` — ensure the Claude Code agent actor + a session row.
  - extend `POST /api/decisions` to accept an optional `sessionId` (questioner =
    that session's agent, `session_id` linked).
  - `GET /api/decisions/[id]` — read one decision's answer state for polling.
- **Edit board** in the web UI: right-click a board → "Edit board" dropdown → a
  popup that **renames** the board and **shows/copies the board id** (the value a
  human pastes into Claude). Requires the board view model to expose the real
  `boards.id` uuid, a rename use-case, and a board-update endpoint.
- Application/use-case + composition-root wiring for the above (find-or-create the
  agent actor, create/reuse a session, the agent-questioner create path,
  get-decision-by-id).

**Out of scope (deferred)**
- **Structured questions** — free-text question → free-text answer only. No
  multiple-choice options, `kind`, priority, context, or title from the channel
  (decisions default to `kind: "approval"`, default priority, initial step, as
  today).
- **Permission relay** (`claude/channel/permission`) — approving Claude's tool use
  from DecisionBroker is a natural follow-up, not this sprint.
- **Board creation from the channel** — humans always create boards in the web UI;
  the channel only posts to an existing board id.
- **Real WorkOS identity** — the human still answers as the seeded dev "current
  user"; the asking agent is a mock `agent` actor.
- **Official channel allowlist** — custom channels run under
  `--dangerously-load-development-channels` during the research preview; we are not
  pursuing an allowlist listing.
- **Schema changes** — none needed (see §5).

## 4. Decisions log (resolved with product owner)

| # | Decision |
| --- | --- |
| Transport | The channel calls the **HTTP API only**, never Postgres directly. Keeps DB creds off the local box and respects the dependency rule. |
| Board key | **Humans create boards**; the board **settings popup displays/copies the board id**. Claude is *told* the board id and passes it on every `ask` (per-call arg, channel stays stateless). Multiple sessions can target the same board. |
| No auto-board | The channel **never creates boards** (drops the prompt's "create a board if it doesn't have one"). |
| Board id source | Claude asks the **user in the terminal** which board to use; the user pastes the id from board settings. Not an env var. |
| Blocking + notify | **Both.** The `ask` tool **long-polls and blocks** until all its questions are answered (authoritative). A channel **notification** also fires when answers land, for terminal visibility. |
| Batching | `ask` takes an **array of 1..N questions and returns only when all are answered** — bulk by default (one human visit, one resume). Dependent questions → Claude makes sequential `ask` calls; each call is its own answer-all barrier. |
| Questions | **Free-text only** this sprint (question text in, answer text out). |
| Identity | Questioner = an `agent` actor; decision carries `session_id`. Human answers as the dev current user. WorkOS later. |
| Session grouping | All `ask`s from one `claude` launch group under **one `sessions` row** — the channel creates it once (`POST /api/sessions`) and reuses the returned `sessionId`. |
| Location | Channel code lives in a new top-level **`/channel/`** folder (the `apps/` seam `architecture.md` §8 anticipates), **packaged as a plugin**. |
| Runtime | **Bun** + `@modelcontextprotocol/sdk` (matches the official channel plugins). |

## 5. No schema change

Sprint 006 already shipped everything the data model needs:

- `actors.kind = 'agent'` — the asking agent is an `agent` actor.
- `sessions(name, project, agent_id)` — one row per `claude` launch. No external
  key column is needed: the channel creates the session once and holds the
  returned `sessionId` for the rest of the launch.
- `decisions.session_id` + `decisions.questioner_id` — link the decision to the
  session and the agent.

So this sprint touches **no `schema.ts` and no migration**. If any of those
assumptions break during build, re-open this section before adding columns.

## 6. HTTP API deliverable

All handlers stay thin (parse/validate with Zod → application service →
serialize), per `architecture.md` §4.

### 6.1 `POST /api/sessions`
Ensure the agent + session for a launch.
- **Body:** `{ name: string, project?: string }` (e.g. `name: "Claude Code · <cwd>"`).
- **Behavior:** find-or-create a singleton `agent` actor (e.g. display name
  `"Claude Code"`), create a `sessions` row referencing it.
- **Returns:** `{ sessionId: string }` (and `agentId` for completeness).
- New use-case `ensure-session.ts` (or `create-session.ts`) + an
  `actors.findOrCreateAgent(name)` repo method + a `sessions` create on the
  session/decision repository.

### 6.2 `POST /api/decisions` (extended, backward-compatible)
- Add **optional** `sessionId` to `createDecisionSchema`.
- When `sessionId` is present: resolve the session → its agent; set the decision's
  **questioner = that agent** and **`session_id` = sessionId**; the opening
  timeline event reads e.g. `Question raised by Claude Code`.
- When `sessionId` is absent: unchanged — questioner = dev current user (the Add
  dialog path keeps working untouched).
- `assigneeId`/`tags` remain optional; the channel sends neither.

### 6.3 `GET /api/decisions/[id]`
- Returns the hydrated decision view model (reusing `get-decision` +
  `toDecisionView`), from which the channel reads **answered state + answer text**.
- 404 if not found. This is the channel's poll endpoint (one request per
  outstanding id; a `?ids=a,b,c` batch variant is an optional optimization, not
  required).

## 7. Web UI deliverable — Edit board (rename + board id)

- The board **view model must expose the real `boards.id` uuid** (today the
  sidebar `Board` carries a `key`/`BoardKey`; the dialog needs the uuid the API
  accepts).
- **Right-click a board** in the sidebar (`Sidebar.tsx`) → a **context dropdown**
  with an **"Edit board"** item.
- Clicking **"Edit board"** opens a **popup/dialog** that:
  - lets the user **rename** the board (persist via a board-update path —
    `boards.name`), and
  - **shows the board id** with a **copy button** and a one-line hint: *"Paste
    this into Claude Code when it asks which board to use."*
- Wiring: a rename needs a small update path — `update-board.ts` use-case (rename
  only this sprint) + a `boards.rename(id, name)` repo method + a `PATCH
  /api/boards/[id]` (or `POST /api/boards/[id]`) thin handler. The board id field
  is read-only/display + copy.

## 8. Channel deliverable — `/channel/`

A single-file (or small) **Bun** MCP server using `@modelcontextprotocol/sdk`,
connected over stdio, declaring `capabilities.experimental['claude/channel']` +
`tools`.

**Config (env):**
- `DECISIONBROKER_API_URL` — base URL of the API (default the deployed
  `https://decisionbroker.com`; set to `http://localhost:3000` for local dev).
- Poll interval (default ~3s) and optional overall timeout (default: none — the
  point is to wait).

**Tool: `ask`**
- **Input:** `{ board_id: string, questions: string[] }` (1..N).
- **Behavior:**
  1. Lazily ensure a session once per process (`POST /api/sessions`), cache the
     `sessionId`.
  2. For each question, `POST /api/decisions` with `{ boardId: board_id,
     question, sessionId }`; collect the returned decision ids.
  3. **Long-poll** `GET /api/decisions/:id` for each id every interval until all
     are answered. Partial answers do **not** return.
  4. Emit `notifications/claude/channel` when all answers land (content =
     short summary; `meta` = board id, count).
  5. **Return** `{ answers: [{ question, answer }, …] }`.
- **Errors:** unknown/invalid board id, unreachable API, or a decision that
  vanishes → return a clear tool error so Claude surfaces it rather than hanging
  silently.

**`instructions` string (into Claude's system prompt):** tell Claude to call
`ask` whenever it needs a human decision/answer; that it must pass the `board_id`
the user provides; that if it doesn't know the board id it should **ask the user
in the terminal** (the user copies it from the board settings in DecisionBroker);
and that it must **not proceed until `ask` returns**.

**One-way safety:** there is no untrusted *inbound sender* pushing into the
session — the only data returned is the human's answer text. Still, treat returned
answer text as **untrusted content** (a shared/multiplayer board means another
person could write it): use it as information, do not execute it blindly. No
sender-allowlist gating is needed because the channel emits only notifications it
generated itself from its own polling.

## 9. Plugin packaging deliverable

- Wrap `/channel/` as a Claude Code **plugin** (plugin manifest + a small
  marketplace entry) so it installs with `/plugin install` and runs with
  `claude --channels …` once allowlisted — but during the research preview it runs
  via `--dangerously-load-development-channels server:<name>` (or
  `plugin:<name>@<marketplace>`).
- A short **README** in `/channel/` documenting: prerequisites (Claude Code
  v2.1.80+, Bun, Anthropic auth), `DECISIONBROKER_API_URL`, install, launch flag,
  and the end-to-end walkthrough.

## 10. Acceptance criteria

1. `npm run lint` and `npx tsc --noEmit` pass for the web app; the channel
   typechecks under Bun. Boundary rules still hold (interface doesn't import
   adapters; the channel reaches DecisionBroker only via HTTP).
2. A human creates a board in the web UI, **right-clicks it → "Edit board"**, and
   the popup lets them **rename** it and **copy the board id**.
3. Launch Claude Code with the channel (dev flag). Ask it to do something that
   needs a human decision; it asks (in the terminal) which board, the user pastes
   the id, and Claude calls `ask(board_id, [q1, q2, …])`.
4. Each question appears as a **decision on that board** in DecisionBroker, with
   **questioner = the Claude Code agent actor** and **linked to one session row**
   for the launch.
5. While questions are unanswered, the **session is blocked** — the `ask` tool has
   not returned and Claude has not continued.
6. **Partial** answers do **not** unblock: answering some-but-not-all leaves the
   session waiting.
7. When the human answers **all** of them (free-text) in DecisionBroker, a channel
   **notification** appears in the terminal, the `ask` tool **returns the answer
   texts**, and Claude continues using them.
8. Two concurrent sessions can target the **same board id** and each unblocks only
   on its own questions.

## 11. Build order (suggested)

1. **API** — `GET /api/decisions/[id]`, `POST /api/sessions`
   (use-case + `findOrCreateAgent` + session create), extend `POST /api/decisions`
   with `sessionId`. Exercise with `curl`.
2. **Web UI** — expose `boards.id` in the view model; add the right-click → "Edit
   board" dropdown + popup (rename + show/copy board id) and its update endpoint.
3. **Channel** — `/channel/` Bun MCP server with the `ask` tool, polling, blocking,
   and the answer notification. Test against local `npm run dev`.
4. **Plugin** — manifest + marketplace entry + README; run end-to-end via the dev
   channel flag.

## 12. Open items / follow-ups

- **Permission relay** — let a human approve/deny Claude's tool use from
  DecisionBroker (`claude/channel/permission`).
- **Structured questions** — multiple-choice (→ `decision_options`), `kind`,
  priority, context/title from the channel for richer UI and a returned
  `chosen_option`.
- **Official channel allowlist** so it runs without the dev flag.
- **Real WorkOS identity** for the asking agent and the answering human.
- **Richer session metadata** (cwd, git branch, model) and a session view in the
  UI; a stable external session key if we ever need the channel to *resume* a
  prior session row across launches.
