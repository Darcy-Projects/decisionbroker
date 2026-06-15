# Sprint 004 — Project Scoping Log

_Last updated: 2026-06-13_

## Objective

Put a scope around the DecisionBroker concept and capture the project's goals at
a high level (the *what* and *why*, not the *how*), so that future sprints —
and any agent/teammate — share one source of truth on what we're building and
what the proof of concept must prove.

## What was done

### 1. Captured the vision
- Authored `prompt.md` describing the overall idea: a collaboration layer
  between AI sessions and people — routing the "ask the user" moment out of the
  terminal, to the right person (or a rule), and back into the session.

### 2. Scoping conversation (clarifying questions)
Resolved the key forks that shape the proof of concept:

- **PoC spine:** a **thin end-to-end slice** (walking skeleton touching every
  part of the loop once) rather than building any one part deeply.
- **AI tap-in:** an **MCP server/tool** the AI calls instead of its built-in
  prompt; the custom-terminal idea is deferred.
- **User scope:** **two users with routing** — request lands in the author's
  inbox, is **forwarded** to a teammate's inbox, teammate answers, AI continues.
- **Work-item format:** **minimal custom JSON now**; choosing a real declarative
  form standard is an explicit early research task.
- **Canonical demo:** a Claude session building a feature hits a design fork →
  emits the question → author's inbox → forward → teammate answers → AI session
  continues.
- **Doc audience:** layered for stakeholders, contributors, and the author/agents.

### 3. Produced the deliverable
- Wrote **`docs/live/Project Overview.md`** — the living scope/vision doc:
  one-sentence pitch, problem, opportunity, mental model + vocabulary,
  goals/non-goals, guiding principles, **PoC scope** (spine, demo, locked
  decisions, out-of-scope), open questions, risks, a **5-stage de-risking plan**
  (Stage 0 spikes the riskiest bet — the round-trip — in isolation first), and
  how it sits on the existing ports-and-adapters foundation.

## Decisions locked (for the PoC)

| Decision | Choice |
| --- | --- |
| Spine | Thin end-to-end slice (walking skeleton) |
| AI tap-in | MCP `ask`-style tool (custom terminal deferred) |
| User scope | Two users; author's inbox → forward → teammate |
| Work-item format | Minimal custom JSON; standard chosen later |

## Open questions carried forward

- Which declarative-form standard renders across web/iOS/Android.
- How an AI session cleanly **blocks** on an out-of-band human answer
  (parallel sessions, timeouts, dead sessions).
- The **rule** model: trigger + action vocabulary, storage, versioning.
- Routing/inbox model — feeds the still-to-be-written `data-model.md`.
- Unauthenticated shared-URL participation.

## Current state

- ✅ Project scope and goals captured in `docs/live/Project Overview.md`.
- ✅ PoC spine, demo, and core decisions agreed.
- ▶️ **NEXT:** Stage 0 — spike the MCP `ask` tap-in (prove the round-trip in
  isolation), per the staged plan in the overview.

## Outcome

Sprint **closed**. Deliverable: `docs/live/Project Overview.md`.
