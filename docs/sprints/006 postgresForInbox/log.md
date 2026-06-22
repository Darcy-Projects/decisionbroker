# Sprint 006 — Postgres for Inbox · Log

What this sprint shipped. The plan/decisions/acceptance live in
[`specifications.md`](./specifications.md); the durable model lives in
[`docs/live/data-model.md`](../../live/data-model.md).

## Outcome

The inbox is now **DB-backed**. The hardcoded array in `src/app/lib/decisions.ts`
is gone; that file now holds only interface-tier **view models** + mappers. The
mock content was moved into a dev **seed** that loads real Postgres rows, and the
read / create / answer paths run through a full hexagonal slice.

## Delivered

- **Schema + migration** (`src/infrastructure/db/drizzle/schema.ts`,
  `drizzle/0001_curious_hobgoblin.sql`): `actor_kind` / `decision_kind` enums and
  the 11 inbox tables (actors, boards, board_steps/priorities/tags, sessions,
  decisions, decision_options/messages/events/tags). Partial unique indexes
  enforce one initial + one terminal step and one default priority per board;
  the circular `decisions.chosen_option_id ↔ decision_options.decision_id` FK is
  emitted via `ALTER` after both tables (typed with `AnyPgColumn`). Applies clean
  to a fresh local Postgres.
- **Domain** (`src/core/domain/decisions/`): `actor`, `board` (+ `DEFAULT_STEPS`
  / `DEFAULT_PRIORITIES` seeding constants), `step`, `priority`, `tag`
  (+ `normalizeTagName`), `session`, `decision` (`refLabel`, `isAnswered`,
  `answer`), `option`, `message`, `event`.
- **Ports** (`src/core/ports/`): `actor-repository`, `board-repository`
  (`BoardConfig`, `CreateBoardData`), `decision-repository` (the `HydratedDecision`
  read shape + `CreateDecisionData`).
- **Application** (`src/core/application/decisions/`): `list-inbox`,
  `get-decision`, `create-decision` (validates tags against the board, fills
  initial step / default priority / next ref / questioner / opening event),
  `answer-decision` (validates the chosen option, applies the `answer` rule,
  appends timeline events), `list-boards`, `create-board`, `archive-board`,
  `list-actors`.
- **Adapters** (`src/infrastructure/db/drizzle/`): `actor-repository`,
  `board-repository` (create-with-seeding in a txn), `decision-repository`
  (batched hydration with no N+1; ref allocated via
  `UPDATE boards SET ref_seq = ref_seq + 1 … RETURNING` inside the create txn).
- **Composition root** (`container.ts` + `config/dev-user.ts`): wires the new
  repositories/services and a dev "current user" actor (`DEV_CURRENT_USER_ID`,
  the seeded **You** actor). Exposes `seedDatabase()` for the dev seed route.
- **Seed** (`db/drizzle/seed.ts`): idempotent load of the original mock content
  (5 boards [4 active + 1 archived], 5 people + 6 agents, per-board
  steps/priorities/tags, 9 decisions with options/messages/timeline). It owns its
  own copy of the data because the data tier may not import the interface tier.
- **Interface**: `lib/decisions.ts` (view models + mappers), `lib/inbox-data.ts`
  (server read path), the inbox page (SSR via services), and API routes —
  `GET /api/inbox`, `POST /api/decisions`, `POST /api/decisions/[id]/answer`,
  `POST /api/dev/seed`. `InboxShell`/`Sidebar`/`AddDecisionDialog`/`DecisionDetail`
  now take boards/people/decisions as data instead of importing static arrays.

## Verification

- `npm run lint` → 0 errors (1 pre-existing `<img>` warning in `Sidebar`).
  Fixed two **pre-existing** `react-hooks/set-state-in-effect` errors by resetting
  form/detail state via a `key` remount instead of synchronous `setState` in an
  effect.
- `npx tsc --noEmit` → clean.
- Fresh local migrate (`db:up` → `db:migrate`) creates all 12 tables.
- Exercised via the running app: seed → `GET /api/inbox` returns the 4+1 boards,
  5 people, 9 decisions; create with a valid tag → 201 (`DEC-2042`, default
  priority, initial step, **You** questioner, opening event); create with an
  unlisted tag → **422**; answer → 200 (moves to terminal step, persists
  answer + answered-by, appends "Answered …" / "Answer returned to session").
  Answered seed decisions render their exact waited labels (e.g. `22m`).

## Notes / follow-ups

- **Neon migration not run here** — `db:migrate:prod` needs the direct Neon
  string in `.env.production.local` (not on this box). Run it before/with the
  next deploy.
- **Local DB port:** this machine already runs a native Postgres on `5432`, so a
  gitignored `.env.local` + a local `docker-compose.override.yml` publish the dev
  container on **55432**. Remove the override (and restore `.env.local` to 5432)
  once 5432 is free.
- Tag add/remove, reassign, and add-message in the detail pane remain
  **client-only** (no endpoints this sprint) — same as before. Read / create /
  answer are the persisted paths.
- Deferred per spec: rules engine (`ruleSuggestion`/`matchedRule`, the
  auto-resolved UI block was removed), per-user unread state, real WorkOS auth.
