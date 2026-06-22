// Interface-tier VIEW MODELS for the inbox. These are the shapes the React
// components render. They are populated from the application use-cases via the
// composition root (see src/app/lib/inbox-data.ts and the API routes) — the
// hardcoded mock arrays that used to live here now seed Postgres (see
// src/infrastructure/db/drizzle/seed.ts).

import type { HydratedDecision } from "@/core/ports/decision-repository";
import type { Actor } from "@/core/domain/decisions/actor";
import type { Board as BoardEntity } from "@/core/domain/decisions/board";

export type Urgency = "low" | "medium" | "high" | "critical";

// Workflow state shown in the UI. Decisions now derive this from their board
// step: the terminal step → "answered", any other step → "needs_decision".
// ("routed"/"auto_resolved" are retained in the union for the badge map but are
// no longer produced — see sprint 006 spec.)
export type DecisionStatus =
  | "needs_decision"
  | "routed"
  | "answered"
  | "auto_resolved";

export type DecisionKind =
  | "approval"
  | "choice"
  | "judgment"
  | "clarification"
  | "escalation";

/** A board's id (uuid) — used as the React key and the inbox selection. */
export type BoardKey = string;

export type Board = {
  key: BoardKey;
  name: string;
  color: string;
};

export type Person = {
  id: string;
  name: string;
  initials: string;
  role: string;
};

export type DecisionOption = {
  id: string;
  label: string;
  detail?: string;
  recommended?: boolean;
};

export type DecisionEvent = {
  id: string;
  at: string;
  label: string;
  actor?: string;
};

export type ConversationMessage = {
  id: string;
  authorType: "user" | "agent";
  authorName: string;
  initials: string;
  at: string;
  text: string;
};

export type Decision = {
  id: string;
  ref: string;
  title: string;
  question: string;
  context: string;
  kind: DecisionKind;
  status: DecisionStatus;
  board: BoardKey;
  urgency: Urgency;
  createdAt: string;
  waitingFor: string;
  session: {
    name: string;
    agent: string;
    project: string;
  };
  routedTo?: Person;
  requestedBy: string;
  tags: string[];
  options?: DecisionOption[];
  answer?: string;
  answeredBy?: string;
  messages?: ConversationMessage[];
  timeline: DecisionEvent[];
  unread?: boolean;
};

/** Everything the inbox page needs in one payload (the read view model). */
export type InboxData = {
  boards: Board[];
  archivedBoards: Board[];
  people: Person[];
  decisions: Decision[];
};

// --- Presentation helpers ---------------------------------------------------

const KNOWN_URGENCIES: Urgency[] = ["low", "medium", "high", "critical"];

/** Two-letter avatar initials from a display name. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return (words[0] ?? "").slice(0, 2).toUpperCase();
}

/** Wall-clock "HH:MM" (UTC) — matches how the seed stored event/message times. */
function hhmm(date: Date): string {
  const h = String(date.getUTCHours()).padStart(2, "0");
  const m = String(date.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** Human "waited" label like "12m", "1h 59m", "3d 2h". */
function formatDuration(from: Date, to: Date): string {
  const totalMin = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
  if (totalMin < 60) return `${totalMin}m`;
  if (totalMin < 1440) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  return h ? `${d}d ${h}h` : `${d}d`;
}

function truncate(text: string, max = 80): string {
  const clean = text.trim();
  return clean.length > max ? clean.slice(0, max) : clean;
}

// --- Mappers (domain → view model) ------------------------------------------

export function toBoardView(board: BoardEntity): Board {
  return { key: board.id, name: board.name, color: board.color };
}

export function toPersonView(actor: Actor): Person {
  return {
    id: actor.id,
    name: actor.displayName,
    initials: initials(actor.displayName),
    role: actor.role ?? "",
  };
}

export function toDecisionView(h: HydratedDecision, now: Date): Decision {
  const { decision } = h;

  const urgencyName = h.priority.name.toLowerCase() as Urgency;
  const safeUrgency = KNOWN_URGENCIES.includes(urgencyName)
    ? urgencyName
    : "medium";

  const answered = h.step.isTerminal;
  const endedAt = decision.answeredAt ?? now;

  const session = h.session
    ? {
        name: h.session.session.name,
        agent: h.session.agent.displayName,
        project: h.session.session.project ?? "",
      }
    : { name: "Manual entry", agent: h.questioner.displayName, project: "" };

  const messages: ConversationMessage[] = h.messages.map(({ message, author }) => ({
    id: message.id,
    authorType: author.kind,
    authorName: author.displayName,
    initials: initials(author.displayName),
    at: hhmm(message.createdAt),
    text: message.body,
  }));

  return {
    id: decision.id,
    ref: `${h.board.refPrefix}${decision.refNumber}`,
    title: decision.title ?? truncate(decision.question),
    question: decision.question,
    context: decision.context ?? "",
    kind: decision.kind,
    status: answered ? "answered" : "needs_decision",
    board: decision.boardId,
    urgency: safeUrgency,
    createdAt: decision.questionAt.toISOString(),
    waitingFor: formatDuration(decision.questionAt, endedAt),
    session,
    routedTo: h.assignee ? toPersonView(h.assignee) : undefined,
    requestedBy: h.questioner.displayName,
    tags: h.tags.map((t) => t.name),
    options: h.options.length
      ? h.options.map((o) => ({
          id: o.id,
          label: o.label,
          detail: o.detail ?? undefined,
          recommended: o.recommended || undefined,
        }))
      : undefined,
    answer: answered
      ? (decision.answerText ?? h.chosenOption?.label ?? undefined)
      : undefined,
    answeredBy: h.answeredBy?.displayName,
    messages: messages.length ? messages : undefined,
    timeline: h.events.map(({ event, actor }) => ({
      id: event.id,
      at: hhmm(event.createdAt),
      label: event.label,
      actor: actor ? initials(actor.displayName) : undefined,
    })),
  };
}
