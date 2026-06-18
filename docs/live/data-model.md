# DecisionBroker — Data Model (Live)

> Living document. Describes the **relational model** behind the inbox: the
> entities, their relationships, the enums, and the invariants that must always
> hold. For **how the code is layered** around this model (domain → ports →
> adapters) see [`architecture.md`](./architecture.md); for the **concrete
> tech** (Postgres, Drizzle, hosting) see [`tech stack.md`](./tech%20stack.md).
>
> Rule of thumb: a fact about *what the data means and which states are legal*
> lives here; a fact about *which vendor/driver stores it* lives in tech stack.

_Last updated: 2026-06-18 (introduced in sprint 006 — postgres for inbox)_

## 1. The picture

A **board** is a workspace for one team/domain (e.g. "Refunds & billing"). Each
board owns its own configurable **steps** (workflow stages), **priorities**, and
allowed **tags**. **Decisions** are the items in a board's inbox: a question
raised by an actor, sitting on a step, waiting to be answered.

**Actors** are the people *and* agents in the system — both are first-class. A
decision is raised by an actor (`questioner`), may be assigned to an actor
(`assignee`), and may originate from an automated **session** run by an agent.

```
                         ┌─────────┐
                         │ actors  │  (kind: user | agent)
                         └────┬────┘
        owner / questioner /  │  assignee / author / event-actor / session-agent
        ───────────────┬──────┴───────────────┬────────────────┐
                       ▼                        ▼                ▼
   ┌─────────┐   ┌───────────┐          ┌────────────┐   ┌──────────┐
   │ boards  │◄──┤ decisions │──────────┤  sessions  │   │  (joins) │
   └────┬────┘   └─────┬─────┘          └────────────┘   └──────────┘
        │              │
        │ owns         │ has many
        ▼              ▼
   board_steps    decision_options
   board_priorities  decision_messages
   board_tags ◄───── decision_tags ──── decision_events
   (per-board config)   (join)          (timeline)
```

## 2. Entities

### actors
A person or an automated agent. Both can raise, be assigned, author messages,
and act on the timeline.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | `defaultRandom()` |
| `kind` | enum `actor_kind` | `user` \| `agent` |
| `display_name` | text, not null | "Dana Whitfield", "Support Copilot" |
| `role` | text, null | human role label ("Head of Legal"); null for agents |
| `workos_user_id` | text, unique, null | set for humans once WorkOS lands; null for agents and pre-auth mocks |
| `created_at` / `updated_at` | timestamptz | |

> **Mock-auth note:** until WorkOS is integrated, `workos_user_id` stays null and
> the app's "current user" is a dev-only seeded actor selected in the composition
> root. See sprint 006 specifications.

### boards
A team/domain workspace that owns its own workflow config.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `name` | text, not null | display name |
| `owner_id` | uuid, not null → `actors.id` | creator |
| `color` | text, not null | Tailwind token, e.g. `bg-primary` |
| `ref_prefix` | text, not null, default `'DEC-'` | per-board, customizable |
| `ref_seq` | integer, not null, default `0` | last issued ref number (per board) |
| `archived` | boolean, not null, default `false` | **soft archive — only boards archive** |
| `created_at` / `updated_at` | timestamptz | |

### board_steps
The ordered workflow stages of one board. Seeded with two endpoints; custom
stages sit between them.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | stable id decisions reference |
| `board_id` | uuid → `boards.id` | |
| `name` | text, not null | "Decision needed", "Answered", … |
| `position` | integer, not null | order within the board |
| `is_initial` | boolean, not null, default `false` | entry step |
| `is_terminal` | boolean, not null, default `false` | "answered" step |
| | | `UNIQUE(board_id, name)` |
| | | partial unique: one `is_initial` per board, one `is_terminal` per board |

### board_priorities
Customizable, ordered priorities per board.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `board_id` | uuid → `boards.id` | |
| `name` | text, not null | "Low" … "Critical" |
| `position` | integer, not null | sort order (higher = more urgent) |
| `is_default` | boolean, not null, default `false` | priority a new decision gets |
| | | `UNIQUE(board_id, name)`; one `is_default` per board |

### board_tags
The set of tags a board allows. A decision may only carry tags from this set.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `board_id` | uuid → `boards.id` | |
| `name` | text, not null | normalized lowercase, no leading `#` |
| | | `UNIQUE(board_id, name)` |

### sessions
The originating agent run a decision came from (optional).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `name` | text, not null | "Support · Ticket #8821" |
| `project` | text, null | "Customer Ops" |
| `agent_id` | uuid, not null → `actors.id` | the agent (an actor of kind `agent`) |
| `created_at` / `updated_at` | timestamptz | |

### decisions
The inbox item — the heart of the model.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `board_id` | uuid, not null → `boards.id` | |
| `ref_number` | integer, not null | per-board sequence; `UNIQUE(board_id, ref_number)` |
| `title` | text, null | short label; UI falls back to a truncated question when null |
| `question` | text, not null | full question text |
| `context` | text, null | background |
| `kind` | enum `decision_kind` | `approval` \| `choice` \| `judgment` \| `clarification` \| `escalation` |
| `step_id` | uuid, not null → `board_steps.id` | current workflow stage |
| `priority_id` | uuid, not null → `board_priorities.id` | |
| `questioner_id` | uuid, not null → `actors.id` | who/what raised it |
| `assignee_id` | uuid, null → `actors.id` | may be a user or an agent |
| `question_at` | timestamptz, not null | when the question was raised |
| `session_id` | uuid, null → `sessions.id` | originating session |
| `auto_resolved` | boolean, not null, default `false` | true = resolved by a rule (still lands on the terminal step) |
| `answer_text` | text, null | free-form answer |
| `chosen_option_id` | uuid, null → `decision_options.id` | picked option (ON DELETE SET NULL) |
| `answered_by_id` | uuid, null → `actors.id` | |
| `answered_at` | timestamptz, null | |
| `created_at` / `updated_at` | timestamptz | |

Display ref = `board.ref_prefix || decision.ref_number` (e.g. `DEC-2041`).

### decision_options
Multiple-choice options a decision offers.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `decision_id` | uuid → `decisions.id` ON DELETE CASCADE | |
| `label` | text, not null | |
| `detail` | text, null | |
| `recommended` | boolean, not null, default `false` | |
| `position` | integer, not null | display order |

### decision_messages
The conversation thread on a decision. Author kind (user/agent) is derived from
the actor, so no separate `authorType` column.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `decision_id` | uuid → `decisions.id` ON DELETE CASCADE | |
| `author_id` | uuid, not null → `actors.id` | |
| `body` | text, not null | |
| `created_at` | timestamptz, not null | the "at" |
| | | index `(decision_id, created_at)` |

### decision_events
The timeline / audit log of a decision.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `decision_id` | uuid → `decisions.id` ON DELETE CASCADE | |
| `actor_id` | uuid, null → `actors.id` | some events have no actor |
| `label` | text, not null | "Question raised by Support Copilot" |
| `created_at` | timestamptz, not null | |
| | | index `(decision_id, created_at)` |

### decision_tags  (join)
Links a decision to one of its board's allowed tags.

| Column | Type | Notes |
| --- | --- | --- |
| `decision_id` | uuid → `decisions.id` ON DELETE CASCADE | |
| `tag_id` | uuid → `board_tags.id` | |
| | | PK `(decision_id, tag_id)` |

## 3. Enums (global)

- `actor_kind`: `user`, `agent`
- `decision_kind`: `approval`, `choice`, `judgment`, `clarification`, `escalation`

Steps, priorities, and tags are **not** enums — they are per-board rows so each
board can customize them. (The old frontend `DecisionStatus`/`Urgency` unions are
superseded: `status` → the board's steps + `auto_resolved`; `urgency` →
`board_priorities`.)

## 4. Invariants

These must always hold; those not expressible as DB constraints are enforced in
the core/application layer.

1. **Step endpoints:** every board has exactly one `is_initial` step and exactly
   one `is_terminal` step (partial unique indexes). Intermediate steps sit
   between them by `position`.
2. **One default priority** per board (`is_default`).
3. **Same-board integrity:** a decision's `step_id`, `priority_id`, and every
   `decision_tags.tag_id` must belong to the same board as the decision.
   *(App-enforced.)*
4. **Chosen option belongs to the decision:** `chosen_option_id`, if set, must be
   an option of that decision. *(App-enforced.)*
5. **Answered shape:** if `answered_at` is set, then `answered_by_id` is set and
   at least one of `answer_text` / `chosen_option_id` is present. A decision is
   considered answered when it is on the board's terminal step.
6. **Refs:** `ref_number` is unique per board and issued by incrementing
   `boards.ref_seq` inside the same transaction as the decision insert.
7. **Soft archive:** only boards archive (`archived = true`). Boards and
   decisions are not hard-deleted in normal flow. Archiving a board hides it and
   its decisions from the active inbox but preserves all rows.

## 5. Lifecycle notes

- **Board creation seeds** two steps (`Decision needed` initial, `Answered`
  terminal) and four priorities (`Low`, `Medium`, `High`, `Critical`, with
  `Medium` default). No tags are seeded.
- **Decision creation** assigns the board's initial step and default priority,
  issues the next ref number, sets `questioner` to the current actor, and starts
  with an empty timeline event ("Question raised by …").
- **Answering** sets `answer_text` and/or `chosen_option_id`, `answered_by_id`,
  `answered_at`, moves the decision to the terminal step, and appends timeline
  events. `auto_resolved = true` marks machine resolution.

## 6. Deferred (not yet modeled)

- **Rules engine** (`ruleSuggestion` / `matchedRule` from the mock) — removed for
  now; will return as its own design.
- **Per-user read/unread state** (the inbox "unread dot").
- **Real WorkOS identities** — `actors.workos_user_id` is the hook; mock until
  then.
