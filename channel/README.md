# DecisionBroker channel

A [Claude Code **channel**](https://code.claude.com/docs/en/channels) (a local
MCP server) that bridges a Claude Code session to
[DecisionBroker](https://decisionbroker.com), so a human answers the session's
questions in DecisionBroker's nicer, multiplayer inbox instead of the terminal.

Claude calls the channel's **`ask`** tool with one or more free-text questions.
Each becomes a **decision** on a human-chosen board, and **the tool blocks until
every question is answered**, then returns the answers so the session continues.
A channel **notification** fires when the answers land, for terminal visibility.

The bridge talks to DecisionBroker **only through its published HTTP API** —
never the database directly.

```
  Claude Code session            channel (this MCP server)         DecisionBroker (HTTP API)
  ───────────────────            ─────────────────────────         ─────────────────────────
  needs human input
  ask(board_id,[q1,q2]) ───────► ensure session ──POST /api/sessions──► agent + session row
                                 each q ────────────POST /api/decisions──► decision on the board
                            ┌──► poll ─────────────GET /api/decisions/:id─► answered? (human answers in UI)
       (turn blocked) ◄─────┤    every ~3s, until ALL answered
                            └──► emit channel notification (visibility)
  resumes with answers ◄─────────  ask(...) returns [{question, answer}, …]
```

## Prerequisites

- **Claude Code v2.1.80+** (channels are a research preview feature).
- **[Bun](https://bun.sh)** (`bun --version`).
- **Anthropic auth** via claude.ai or a Console API key (channels are not
  available on Bedrock / Vertex / Foundry).
- A DecisionBroker board to post to. Create one in the web UI, then **right-click
  the board → Edit board** to copy its **board id** — that's what Claude asks you
  for.

## Configuration (env)

| Variable | Default | Purpose |
| --- | --- | --- |
| `DECISIONBROKER_API_URL` | `https://decisionbroker.com` | Base URL of the API. Set to `http://localhost:3000` for local dev. |
| `DECISIONBROKER_POLL_INTERVAL_MS` | `3000` | How often to poll a decision for its answer. |
| `DECISIONBROKER_TIMEOUT_MS` | `0` (wait forever) | Optional overall timeout for one `ask` call. |

## Install & run

During the research preview, custom channels aren't on the Anthropic allowlist,
so they run behind `--dangerously-load-development-channels`.

### Option A — bare MCP server (fastest for local dev)

From a project that has `channel/.mcp.json` on its path (or copy the `decisionbroker`
entry into your own `.mcp.json` / `~/.claude.json` with an absolute path to
`server.ts`), launch:

```bash
DECISIONBROKER_API_URL=http://localhost:3000 \
  claude --dangerously-load-development-channels server:decisionbroker
```

Claude Code spawns `server.ts` over stdio (it runs `bun start`, which installs
deps then runs the server). A dim startup notice confirms the channel registered.

### Option B — as a plugin

```text
# add this folder as a one-plugin marketplace, then install
/plugin marketplace add /absolute/path/to/decisionbroker/channel
/plugin install decisionbroker-channel@decisionbroker
/reload-plugins
```

Then launch with the plugin form of the dev flag:

```bash
claude --dangerously-load-development-channels plugin:decisionbroker-channel@decisionbroker
```

(Set `DECISIONBROKER_API_URL` in your shell first when pointing at local dev.)

## End-to-end walkthrough

1. Start DecisionBroker locally (`npm run db:up && npm run dev`) or use
   production. Create a board and copy its id from **Edit board**.
2. Launch Claude Code with the channel (see above).
3. Ask Claude to do something that needs a human decision. It will call `ask`;
   if it doesn't have a board id, it asks you in the terminal — paste the id.
4. Each question appears as a decision on that board, raised by the **Claude
   Code** agent and linked to one **session** for the launch.
5. While questions are unanswered, the session is **blocked** — `ask` hasn't
   returned. Answering some-but-not-all keeps it waiting.
6. Answer them all in DecisionBroker. A notification appears in the terminal,
   `ask` returns the answer texts, and Claude continues.

Two concurrent sessions can target the **same board id**; each unblocks only on
its own questions.

## The `ask` tool

- **Input:** `{ board_id: string, questions: string[] }` (1..N questions).
- **Returns:** `{ answers: [{ question, answer }, …] }` once **all** are
  answered (also rendered as readable `Q/A` text).
- **Errors** (unknown/invalid board id, unreachable API, a vanished decision)
  surface as a clear tool error so Claude doesn't hang silently.

## Safety

There is no untrusted inbound sender pushing into the session — the only data
returned is the human's answer text. Still, a shared/multiplayer board means
someone else could write an answer, so the channel's instructions tell Claude to
treat returned answers as **untrusted content**: information to use, not
instructions to execute blindly.

## Develop

```bash
bun install
bun run typecheck   # tsc --noEmit
bun server.ts       # runs the server on stdio (for manual MCP testing)
```
