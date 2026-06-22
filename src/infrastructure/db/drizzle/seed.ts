// Dev seed: load the original inbox mock content into Postgres so the inbox
// renders from real rows with no visible change. This module owns a copy of the
// mock data because the data tier must not import the interface tier (the old
// home of this data was src/app/lib/decisions.ts). Idempotent: it wipes the
// inbox tables and re-inserts on every run.
//
// Triggered via the composition root (`seedDatabase`) — see container.ts.

import { eq } from "drizzle-orm";
import { getDb } from "@/infra/db/drizzle/client";
import { DEV_CURRENT_USER_ID } from "@/infra/config/dev-user";
import {
  DEFAULT_PRIORITIES,
  DEFAULT_STEPS,
} from "@/core/domain/decisions/board";
import { normalizeTagName } from "@/core/domain/decisions/tag";
import {
  actors,
  boardPriorities,
  boards,
  boardSteps,
  boardTags,
  decisionEvents,
  decisionMessages,
  decisionOptions,
  decisions,
  decisionTags,
  sessions,
} from "@/infra/db/drizzle/schema";

// --- Mock content (mirrors the former src/app/lib/decisions.ts) -------------

interface PersonSeed {
  name: string;
  role: string;
}

const PEOPLE: PersonSeed[] = [
  { name: "Dana Whitfield", role: "Head of Legal" },
  { name: "Marcus Lee", role: "Eng Lead" },
  { name: "Priya Nair", role: "Finance" },
  { name: "Sam Okafor", role: "Product" },
  { name: "You", role: "Operations" }, // the dev "current user"
];

const AGENTS = [
  "Support Copilot",
  "Eng Agent",
  "Marketing Agent",
  "Finance Agent",
  "Contracts Agent",
  "Design Agent",
];

interface BoardSeed {
  key: string;
  name: string;
  color: string;
  archived: boolean;
}

const BOARDS: BoardSeed[] = [
  { key: "refunds-billing", name: "Refunds & billing", color: "bg-chart-2", archived: false },
  { key: "legal-contracts", name: "Legal & contracts", color: "bg-destructive", archived: false },
  { key: "engineering", name: "Engineering", color: "bg-primary", archived: false },
  { key: "growth-brand", name: "Growth & brand", color: "bg-chart-3", archived: false },
  { key: "sprint-005-inbox-view", name: "Sprint 005 - Inbox View", color: "bg-chart-3", archived: true },
];

type Kind = "approval" | "choice" | "judgment" | "clarification" | "escalation";
type Urgency = "Low" | "Medium" | "High" | "Critical";

interface OptionSeed {
  label: string;
  detail?: string;
  recommended?: boolean;
}
interface MessageSeed {
  author: string; // actor display name (person or agent)
  at: string; // "HH:MM" on the decision's date
  text: string;
}
interface EventSeed {
  at: string;
  label: string;
  actor?: string; // actor display name, or omitted for system events
}

interface DecisionSeed {
  ref: number;
  board: string; // board key
  title: string;
  question: string;
  context: string;
  kind: Kind;
  urgency: Urgency;
  answered: boolean;
  date: string; // ISO question_at
  /** minutes between question and answer (answered decisions only). */
  waitedMinutes?: number;
  session: { name: string; agent: string; project: string };
  questioner: string; // actor display name (usually the agent)
  assignee?: string; // person display name
  tags: string[];
  options?: OptionSeed[];
  answer?: string;
  answeredBy?: string;
  messages?: MessageSeed[];
  timeline: EventSeed[];
}

const DECISIONS: DecisionSeed[] = [
  {
    ref: 2041,
    board: "refunds-billing",
    title: "Approve refund above policy limit",
    question:
      "Customer Acme Corp is requesting a $4,200 refund for an annual plan canceled 9 days after the 30-day window. Should I issue the full refund, a prorated refund, or deny it?",
    context:
      "The support agent session reached the refund step. Standard policy caps discretionary refunds at $2,000 and the window has closed. Acme is a 3-year enterprise account ($88k ARR) and the cancellation reason was a billing error on our side.",
    kind: "approval",
    urgency: "High",
    answered: false,
    date: "2026-06-15T13:42:00Z",
    session: { name: "Support · Ticket #8821", agent: "Support Copilot", project: "Customer Ops" },
    questioner: "Support Copilot",
    tags: ["refunds", "exception", "enterprise"],
    options: [
      { label: "Approve full $4,200 refund", detail: "Billing error on our side justifies exception", recommended: true },
      { label: "Approve prorated refund", detail: "Refund unused 11 months only (~$3,850)" },
      { label: "Deny — outside policy window" },
    ],
    messages: [
      { author: "Support Copilot", at: "13:42", text: "Flagging this one — the refund is $2,200 over the discretionary cap and the 30-day window closed 9 days ago." },
      { author: "Priya Nair", at: "13:45", text: "Can you confirm the cancellation was caused by our billing error and not the customer changing their mind?" },
      { author: "Support Copilot", at: "13:47", text: "Confirmed — the duplicate charge originated from our retry job on May 3rd. Acme has a clean payment history across 3 years." },
    ],
    timeline: [{ at: "13:42", label: "Question raised by Support Copilot", actor: "Support Copilot" }],
  },
  {
    ref: 2040,
    board: "engineering",
    title: "Pick database for new analytics service",
    question:
      "I'm scaffolding the events analytics service. Should I use ClickHouse, Postgres + TimescaleDB, or BigQuery? The PRD expects ~2B events/month with sub-second dashboard queries.",
    context:
      "Coding session is blocked on infra choice before generating the schema and ingestion layer. Team already runs Postgres for transactional data; no existing ClickHouse footprint.",
    kind: "choice",
    urgency: "Medium",
    answered: false,
    date: "2026-06-15T13:10:00Z",
    session: { name: "Build · analytics-service", agent: "Eng Agent", project: "Platform" },
    questioner: "Eng Agent",
    assignee: "Marcus Lee",
    tags: ["infra"],
    options: [
      { label: "ClickHouse", detail: "Best for high-volume analytical queries", recommended: true },
      { label: "Postgres + TimescaleDB", detail: "Reuse existing ops knowledge" },
      { label: "BigQuery", detail: "Managed, but adds vendor + latency" },
    ],
    timeline: [{ at: "13:10", label: "Question raised by Eng Agent", actor: "Eng Agent" }],
  },
  {
    ref: 2038,
    board: "growth-brand",
    title: "Tone for churn win-back email",
    question:
      "Drafting the win-back email for lapsed Pro users. Should the tone be apologetic, value-forward, or incentive-led with a discount?",
    context:
      "Marketing session generating a 3-email sequence. Brand guidelines discourage discounting but allow it for win-back under approval.",
    kind: "judgment",
    urgency: "Low",
    answered: false,
    date: "2026-06-15T11:55:00Z",
    session: { name: "Campaign · Win-back Q2", agent: "Marketing Agent", project: "Growth" },
    questioner: "Marketing Agent",
    assignee: "Sam Okafor",
    tags: ["brand", "copy"],
    options: [
      { label: "Value-forward, no discount", recommended: true },
      { label: "Incentive-led with 20% off" },
      { label: "Apologetic + roadmap tease" },
    ],
    timeline: [{ at: "11:55", label: "Question raised by Marketing Agent", actor: "Marketing Agent" }],
  },
  {
    ref: 2035,
    board: "refunds-billing",
    title: "Approve expense report over $1k",
    question: "Travel expense of $1,340 submitted without itemized receipts. Approve, request receipts, or reject?",
    context: "Finance session processing reimbursements. Policy requires itemized receipts above $1,000.",
    kind: "approval",
    urgency: "Medium",
    answered: true,
    date: "2026-06-15T10:20:00Z",
    waitedMinutes: 22,
    session: { name: "Finance · Reimbursements", agent: "Finance Agent", project: "Finance" },
    questioner: "Finance Agent",
    assignee: "Priya Nair",
    tags: ["expenses", "policy"],
    answer: "Request itemized receipts before approving the $1,340 expense.",
    answeredBy: "Priya Nair",
    timeline: [
      { at: "10:20", label: "Question raised by Finance Agent", actor: "Finance Agent" },
      { at: "10:31", label: "Answered: request itemized receipts", actor: "Priya Nair" },
      { at: "10:31", label: "Answer returned to session" },
    ],
  },
  {
    ref: 2042,
    board: "legal-contracts",
    title: "Approve MSA with mutual indemnification edit",
    question:
      "Counterparty redlined the MSA to make indemnification mutual and capped at fees paid. Should I accept the edit, counter with our standard cap, or escalate to Legal?",
    context:
      "Contract review session is finalizing a partner agreement. Our playbook allows mutual indemnification but flags fee-based caps for review on deals over $100k.",
    kind: "approval",
    urgency: "High",
    answered: false,
    date: "2026-06-15T12:48:00Z",
    session: { name: "Legal · Partner MSA", agent: "Contracts Agent", project: "Legal Ops" },
    questioner: "Contracts Agent",
    assignee: "Dana Whitfield",
    tags: ["contracts", "indemnification", "review"],
    options: [
      { label: "Counter with standard liability cap", detail: "Cap at 12 months of fees", recommended: true },
      { label: "Accept mutual indemnification as redlined" },
      { label: "Escalate to Legal for full review" },
    ],
    messages: [
      { author: "Contracts Agent", at: "12:48", text: "Counterparty wants mutual indemnification capped at fees paid. This is a $140k deal, so the fee-based cap trips our review flag." },
      { author: "Dana Whitfield", at: "12:55", text: "Mutual indemnification is fine, but I'm not comfortable with a fees-paid cap on a deal this size. Let me see the exact redline language." },
    ],
    timeline: [{ at: "12:48", label: "Question raised by Contracts Agent", actor: "Contracts Agent" }],
  },
  {
    ref: 2043,
    board: "engineering",
    title: "Choose CI provider for monorepo migration",
    question:
      "Migrating the monorepo CI. Should I move to GitHub Actions, keep CircleCI, or adopt Buildkite for self-hosted runners?",
    context:
      "Platform session is planning the CI migration. Build times have grown 40% this quarter and the team wants faster caching.",
    kind: "choice",
    urgency: "Medium",
    answered: true,
    date: "2026-06-15T09:30:00Z",
    waitedMinutes: 22,
    session: { name: "Build · ci-migration", agent: "Eng Agent", project: "Platform" },
    questioner: "Eng Agent",
    assignee: "Marcus Lee",
    tags: ["ci", "infra", "tooling"],
    answer: "Adopt GitHub Actions for the monorepo CI migration.",
    answeredBy: "Marcus Lee",
    timeline: [
      { at: "09:30", label: "Question raised by Eng Agent", actor: "Eng Agent" },
      { at: "09:52", label: "Answered: adopt GitHub Actions", actor: "Marcus Lee" },
      { at: "09:52", label: "Answer returned to session" },
    ],
  },
  {
    ref: 1980,
    board: "sprint-005-inbox-view",
    title: "Confirm two-pane vs single-column inbox layout",
    question:
      "Should the inbox use a two-pane master/detail layout or a single-column list with a slide-over detail panel?",
    context:
      "Sprint 005 design session for the inbox view. Desktop is the primary surface and reviewers triage many items per session.",
    kind: "choice",
    urgency: "Medium",
    answered: true,
    date: "2026-05-28T14:10:00Z",
    waitedMinutes: 15,
    session: { name: "Design · Inbox View", agent: "Design Agent", project: "Sprint 005" },
    questioner: "Design Agent",
    assignee: "Sam Okafor",
    tags: ["design", "layout"],
    answer: "Use a two-pane master/detail layout for the inbox.",
    answeredBy: "Sam Okafor",
    timeline: [
      { at: "14:10", label: "Question raised by Design Agent", actor: "Design Agent" },
      { at: "14:25", label: "Answered: two-pane master/detail", actor: "Sam Okafor" },
      { at: "14:25", label: "Answer returned to session" },
    ],
  },
  {
    ref: 1981,
    board: "sprint-005-inbox-view",
    title: "Default sort order for the decision list",
    question:
      "Should the decision list default to sorting by urgency, by oldest waiting, or by most recently created?",
    context: "Sprint 005 inbox view. SLA targets prioritize the longest-waiting critical items first.",
    kind: "choice",
    urgency: "Low",
    answered: true,
    date: "2026-05-28T15:02:00Z",
    waitedMinutes: 18,
    session: { name: "Design · Inbox View", agent: "Design Agent", project: "Sprint 005" },
    questioner: "Design Agent",
    assignee: "Marcus Lee",
    tags: ["design", "sorting"],
    answer: "Default the decision list to sort by oldest waiting.",
    answeredBy: "Marcus Lee",
    timeline: [
      { at: "15:02", label: "Question raised by Design Agent", actor: "Design Agent" },
      { at: "15:20", label: "Answered: sort by oldest waiting", actor: "Marcus Lee" },
      { at: "15:20", label: "Answer returned to session" },
    ],
  },
  {
    ref: 1982,
    board: "sprint-005-inbox-view",
    title: "Keyboard shortcuts for triage actions",
    question:
      "Should we add keyboard shortcuts (j/k to navigate, e to answer) to the inbox, or ship without them this sprint?",
    context: "Sprint 005 inbox view. Power users requested faster triage; scope must fit within the sprint.",
    kind: "approval",
    urgency: "Low",
    answered: true,
    date: "2026-05-29T09:45:00Z",
    waitedMinutes: 20,
    session: { name: "Design · Inbox View", agent: "Design Agent", project: "Sprint 005" },
    questioner: "Design Agent",
    assignee: "Sam Okafor",
    tags: ["design", "shortcuts"],
    answer: "Ship j/k navigation shortcuts only this sprint.",
    answeredBy: "Sam Okafor",
    timeline: [
      { at: "09:45", label: "Question raised by Design Agent", actor: "Design Agent" },
      { at: "10:05", label: "Answered: ship j/k navigation only", actor: "Sam Okafor" },
      { at: "10:05", label: "Answer returned to session" },
    ],
  },
];

// --- Helpers ----------------------------------------------------------------

/** Combine the date part of an ISO timestamp with an "HH:MM" wall time (UTC). */
function atTime(dateISO: string, hhmm: string): Date {
  const datePart = dateISO.slice(0, 10);
  return new Date(`${datePart}T${hhmm}:00Z`);
}

// --- Seed -------------------------------------------------------------------

export async function seedInbox(): Promise<{
  actors: number;
  boards: number;
  decisions: number;
}> {
  const db = getDb();

  return db.transaction(async (tx) => {
    // Wipe inbox rows (decisions cascade to their satellites; boards cascade to
    // steps/priorities/tags). Files are untouched.
    await tx.delete(decisions);
    await tx.delete(sessions);
    await tx.delete(boards);
    await tx.delete(actors);

    // Actors: people (one with the fixed dev-user id) + agents.
    const actorId = new Map<string, string>();
    for (const person of PEOPLE) {
      const isCurrentUser = person.name === "You";
      const [row] = await tx
        .insert(actors)
        .values({
          ...(isCurrentUser ? { id: DEV_CURRENT_USER_ID } : {}),
          kind: "user",
          displayName: person.name,
          role: person.role,
        })
        .returning({ id: actors.id });
      actorId.set(person.name, row.id);
    }
    for (const agent of AGENTS) {
      const [row] = await tx
        .insert(actors)
        .values({ kind: "agent", displayName: agent, role: null })
        .returning({ id: actors.id });
      actorId.set(agent, row.id);
    }
    const ownerId = actorId.get("You")!;

    // Boards + their seeded steps/priorities, and the tag set each board needs.
    const boardId = new Map<string, string>();
    const initialStepId = new Map<string, string>();
    const terminalStepId = new Map<string, string>();
    const priorityId = new Map<string, Map<string, string>>(); // board -> name -> id
    const tagId = new Map<string, Map<string, string>>(); // board -> name -> id

    // Collect the allowed tags per board from the decisions that use them.
    const tagsByBoard = new Map<string, Set<string>>();
    for (const b of BOARDS) tagsByBoard.set(b.key, new Set());
    for (const d of DECISIONS) {
      const set = tagsByBoard.get(d.board)!;
      for (const t of d.tags) set.add(normalizeTagName(t));
    }

    for (const b of BOARDS) {
      const [boardRow] = await tx
        .insert(boards)
        .values({
          name: b.name,
          ownerId,
          color: b.color,
          archived: b.archived,
        })
        .returning({ id: boards.id });
      boardId.set(b.key, boardRow.id);

      const stepRows = await tx
        .insert(boardSteps)
        .values(
          DEFAULT_STEPS.map((s) => ({
            boardId: boardRow.id,
            name: s.name,
            position: s.position,
            isInitial: s.isInitial,
            isTerminal: s.isTerminal,
          })),
        )
        .returning();
      for (const s of stepRows) {
        if (s.isInitial) initialStepId.set(b.key, s.id);
        if (s.isTerminal) terminalStepId.set(b.key, s.id);
      }

      const priorityRows = await tx
        .insert(boardPriorities)
        .values(
          DEFAULT_PRIORITIES.map((p) => ({
            boardId: boardRow.id,
            name: p.name,
            position: p.position,
            isDefault: p.isDefault,
          })),
        )
        .returning();
      priorityId.set(b.key, new Map(priorityRows.map((p) => [p.name, p.id])));

      const tagNames = [...tagsByBoard.get(b.key)!];
      const boardTagIds = new Map<string, string>();
      if (tagNames.length) {
        const tagRows = await tx
          .insert(boardTags)
          .values(tagNames.map((name) => ({ boardId: boardRow.id, name })))
          .returning();
        for (const t of tagRows) boardTagIds.set(t.name, t.id);
      }
      tagId.set(b.key, boardTagIds);
    }

    // One session per decision.
    const sessionIdFor = new Map<number, string>();
    for (const d of DECISIONS) {
      const [row] = await tx
        .insert(sessions)
        .values({
          name: d.session.name,
          project: d.session.project,
          agentId: actorId.get(d.session.agent)!,
        })
        .returning({ id: sessions.id });
      sessionIdFor.set(d.ref, row.id);
    }

    // Decisions + satellites.
    const maxRefByBoard = new Map<string, number>();
    for (const d of DECISIONS) {
      const questionAt = new Date(d.date);
      const answeredAt =
        d.answered && d.waitedMinutes != null
          ? new Date(questionAt.getTime() + d.waitedMinutes * 60_000)
          : null;
      const stepId = d.answered
        ? terminalStepId.get(d.board)!
        : initialStepId.get(d.board)!;

      const [decisionRow] = await tx
        .insert(decisions)
        .values({
          boardId: boardId.get(d.board)!,
          refNumber: d.ref,
          title: d.title,
          question: d.question,
          context: d.context,
          kind: d.kind,
          stepId,
          priorityId: priorityId.get(d.board)!.get(d.urgency)!,
          questionerId: actorId.get(d.questioner)!,
          assigneeId: d.assignee ? actorId.get(d.assignee)! : null,
          questionAt,
          sessionId: sessionIdFor.get(d.ref)!,
          answerText: d.answer ?? null,
          answeredById: d.answeredBy ? actorId.get(d.answeredBy)! : null,
          answeredAt,
        })
        .returning();

      const max = maxRefByBoard.get(d.board) ?? 0;
      if (d.ref > max) maxRefByBoard.set(d.board, d.ref);

      if (d.options?.length) {
        await tx.insert(decisionOptions).values(
          d.options.map((o, i) => ({
            decisionId: decisionRow.id,
            label: o.label,
            detail: o.detail ?? null,
            recommended: o.recommended ?? false,
            position: i,
          })),
        );
      }

      if (d.tags.length) {
        const boardTagIds = tagId.get(d.board)!;
        await tx.insert(decisionTags).values(
          d.tags.map((t) => ({
            decisionId: decisionRow.id,
            tagId: boardTagIds.get(normalizeTagName(t))!,
          })),
        );
      }

      if (d.messages?.length) {
        await tx.insert(decisionMessages).values(
          d.messages.map((m) => ({
            decisionId: decisionRow.id,
            authorId: actorId.get(m.author)!,
            body: m.text,
            createdAt: atTime(d.date, m.at),
          })),
        );
      }

      if (d.timeline.length) {
        await tx.insert(decisionEvents).values(
          d.timeline.map((e) => ({
            decisionId: decisionRow.id,
            actorId: e.actor ? (actorId.get(e.actor) ?? null) : null,
            label: e.label,
            createdAt: atTime(d.date, e.at),
          })),
        );
      }
    }

    // Advance each board's ref sequence past the highest seeded ref so the next
    // created decision continues the series (invariant 6).
    for (const [boardKey, maxRef] of maxRefByBoard) {
      await tx
        .update(boards)
        .set({ refSeq: maxRef })
        .where(eq(boards.id, boardId.get(boardKey)!));
    }

    return {
      actors: PEOPLE.length + AGENTS.length,
      boards: BOARDS.length,
      decisions: DECISIONS.length,
    };
  });
}
