# Sprint 006 — Postgres for Inbox · Specifications

> Working spec for this sprint. The durable model it produces lives in
> [`docs/live/data-model.md`](../../live/data-model.md); this file is the plan,
> the decisions log, and the acceptance criteria. Source prompt: [`prompt.md`](./prompt.md).

## 1. Goal

Make the inbox **DB-backed**. Today the inbox renders from a hardcoded array in
`src/app/lib/decisions.ts`. This sprint designs the relational model behind it
and builds the full hexagonal slice (domain → ports → Drizzle adapter →
application use-cases → composition root → interface) so the inbox reads and
writes real Postgres rows — matching the current frontend as closely as
possible.

## 2. Scope

**In scope**
- Relational model for boards, per-board steps/priorities/tags, actors, sessions,
  decisions, and the decision satellites (options, messages, timeline events,
  tag links). Documented in `data-model.md`.
- Drizzle schema + migration for all the above.
- Full hexagonal slice: domain entities/rules, ports, Drizzle adapters,
  application use-cases, wired through `container.ts`.
- A seed that loads the existing mock content so the inbox renders from Postgres
  unchanged.
- Rewire the inbox **read** path, **create** (Add decision dialog), and **answer**
  path to go through the application services.

**Out of scope (deferred)**
- Rules engine (`ruleSuggestion` / `matchedRule`) — removed entirely for now.
- Per-user read/unread state (the unread dot) — dropped this sprint.
- Real WorkOS auth — mocked via a dev "current user" actor.
- Keyboard shortcuts, sorting/filtering UI, and other inbox UX beyond what exists.

## 3. Decisions log (resolved with product owner)

| # | Decision |
| --- | --- |
| Match | Match the current frontend as closely as possible; add fields it needs. |
| Slice | Deliver the **full** hexagonal slice, not just schema. |
| Doc | Produce `docs/live/data-model.md` as part of this spec. |
| Actors | **Single `actors` table** with `kind: user \| agent`; both are first-class. `questioner`, `assignee`, message author, event actor, and session agent all reference it. Assignee may be a user *or* an agent. |
| Auth mock | `actors.workos_user_id` (null until WorkOS). Dev-only "current user" actor chosen in the composition root. |
| Keys | Per-board steps/priorities/tags use **surrogate `uuid` PK + `UNIQUE(board_id, name)`** (not composite PK) — same no-duplicates guarantee, renames stay cheap. |
| Steps | Each step has `position` + `is_initial` / `is_terminal`. Board seeds "Decision needed" (initial) and "Answered" (terminal); custom steps go between. |
| Status | The old `routed` status is dropped; `auto_resolved` becomes a boolean on the decision (it still lands on the terminal/Answered step). Workflow position = `step_id`. |
| Priorities | Per-board, customizable, ordered, with one `is_default`. Seed `Low/Medium/High/Critical`, default `Medium`. |
| Tags | Enforced against the board's allowed set (`board_tags` + `decision_tags` join). |
| Refs | Per-board `ref_prefix` (default `DEC-`) + per-board sequence (`boards.ref_seq`). Display = prefix + number. |
| Answer | `answer_text` and/or `chosen_option_id`, plus `answered_by_id` / `answered_at`. At least one of text/option required when answered. |
| Satellites | `decision_options`, `decision_messages`, `decision_events`, `sessions` all built this sprint. |
| Seeding | Board creation auto-seeds 2 steps + 4 priorities (0 tags). |
| Conventions | Match the `files` table house style: `uuid` PKs `defaultRandom()`, `timestamptz` `created_at`/`updated_at`, snake_case, indexes on hot lookups. |
| Archive | **Only boards** soft-archive (`archived`). Decisions are never archived or hard-deleted in normal flow. |

## 4. Schema deliverable

Implement the tables, enums, and invariants exactly as specified in
[`data-model.md`](../../live/data-model.md) §2–§4, in
`src/infrastructure/db/drizzle/schema.ts`.

Implementation notes for the adapter author:
- **Enums:** add `actor_kind` and `decision_kind` `pgEnum`s.
- **Partial unique indexes** (Postgres): one `is_initial` and one `is_terminal`
  per board on `board_steps`; one `is_default` per board on `board_priorities`.
- **Circular FK:** `decisions.chosen_option_id → decision_options.id` and
  `decision_options.decision_id → decisions.id` reference each other. Create the
  `chosen_option_id` FK after both tables exist (Drizzle self/late reference);
  `ON DELETE SET NULL`.
- **Ref issuing:** allocate `ref_number` via
  `UPDATE boards SET ref_seq = ref_seq + 1 ... RETURNING ref_seq` inside the
  create transaction (no race).
- **Cascades:** `decision_options/messages/events/tags` cascade-delete with their
  decision (used by tests/seed resets, not normal flow).
- DB workflow per AGENTS.md: edit `schema.ts` → `db:push` while iterating →
  `db:generate` + `db:migrate` once stable; `db:migrate:prod` for Neon.

## 5. Hexagonal slice deliverable

Mirror the existing `files` slice (see `architecture.md` §5 worked example).

**Domain — `src/core/domain/decisions/`** (pure types + rules, no I/O)
- `actor.ts`, `board.ts`, `step.ts`, `priority.ts`, `tag.ts`, `session.ts`
- `decision.ts` — entity + rules: `refLabel(board, decision)`, `isAnswered()`,
  `answer(...)`, and the default-seeding constants (`DEFAULT_STEPS`,
  `DEFAULT_PRIORITIES`).
- `option.ts`, `message.ts`, `event.ts`

**Ports — `src/core/ports/`**
- `actor-repository.ts` — list/get actors, resolve current user.
- `board-repository.ts` — boards + their steps/priorities/tags (incl. seeding).
- `decision-repository.ts` — decisions + options/messages/events/tags, with the
  hydrated read shape the inbox needs.

**Application — `src/core/application/decisions/`**
- `list-inbox.ts` — decisions for a board (or all active boards), hydrated.
- `get-decision.ts` — one decision with options/messages/timeline/tags.
- `create-decision.ts` — input `{ boardId, question, assigneeId, tags }` (matches
  `AddDecisionDialog`'s `NewDecisionInput` + board context). Fills defaults:
  initial step, default priority, next ref, current actor as questioner, opening
  timeline event. Validates tags against the board.
- `answer-decision.ts` — sets answer text/option, answered-by/at, moves to
  terminal step, appends events.
- `list-boards.ts`, `create-board.ts` (seeds steps + priorities),
  `archive-board.ts`, `list-actors.ts`.

**Infrastructure — `src/infrastructure/db/drizzle/`**
- `actor-repository.ts`, `board-repository.ts`, `decision-repository.ts` — map
  rows ⇄ domain types (rows never leak inward).

**Composition root — `src/infrastructure/config/container.ts`**
- Wire the new repositories and services; expose the dev "current user" actor id.

**Interface — `src/app/`**
- Replace the static data in `lib/decisions.ts`: keep the `Decision` (and related)
  shapes as **interface-tier view models**, populated from the use-cases via the
  container; remove the hardcoded `decisions`/`people`/`boards` arrays.
- Wire the Add-decision dialog and the answer action to the create/answer
  services. Per `architecture.md` §4, the published contract is the HTTP API —
  add `src/app/api` route handlers (thin: parse/validate with Zod → service →
  serialize) for the inbox read, create, and answer operations.

## 6. Seed deliverable

A seed (script or dev-only route) that loads the current mock content from the
original `decisions.ts` so the inbox renders from Postgres with no visible
change: the 5 boards (4 active + 1 archived), the 5 people + the agents as
actors, their steps/priorities/tags, and the sample decisions with their options,
messages, and timeline events.

## 7. Acceptance criteria

1. `npm run lint` passes — boundary rules in `eslint.config.mjs` are respected
   (interface doesn't import adapters; core imports no infra/framework).
2. Migration applies cleanly to a fresh local Postgres (`db:up` → migrate) and to
   Neon (`db:migrate:prod`).
3. After seeding, the inbox at `/inbox` renders the same boards and decisions it
   did from the hardcoded array — now sourced from Postgres.
4. Creating a decision via the Add-decision dialog inserts a row (correct board,
   initial step, default priority, next ref, current actor as questioner, opening
   timeline event) and it appears in the inbox.
5. Answering a decision persists the answer (text and/or chosen option),
   answered-by/at, moves it to the terminal step, and the inbox reflects it.
6. Tags outside a board's allowed set are rejected by the create path.
7. All invariants in `data-model.md` §4 hold (verified by the create/answer paths
   and a quick manual check).

## 8. Open items / follow-ups

- Real WorkOS auth replaces the dev current-user mock (later sprint).
- Rules engine returns as its own design (`ruleSuggestion`/`matchedRule`).
- Per-user read/unread state (the inbox unread dot).
- "Specific option + free-form response" answer UI: the model supports it
  (`chosen_option_id` + `answer_text` together); the answer UI may need a small
  update to let a user pick an option *and* add a note.
