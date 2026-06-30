import type { Actor } from "@/core/domain/decisions/actor";
import type { Board } from "@/core/domain/decisions/board";
import type { Decision, DecisionKind } from "@/core/domain/decisions/decision";
import type { DecisionEvent } from "@/core/domain/decisions/event";
import type { DecisionMessage } from "@/core/domain/decisions/message";
import type { DecisionOption } from "@/core/domain/decisions/option";
import type { Priority } from "@/core/domain/decisions/priority";
import type { Session } from "@/core/domain/decisions/session";
import type { Step } from "@/core/domain/decisions/step";
import type { Tag } from "@/core/domain/decisions/tag";

/** A message paired with its resolved author. */
export interface HydratedMessage {
  message: DecisionMessage;
  author: Actor;
}

/** A timeline event paired with its resolved actor (null for system events). */
export interface HydratedEvent {
  event: DecisionEvent;
  actor: Actor | null;
}

/**
 * The fully-hydrated read shape the inbox needs: a decision with every related
 * entity resolved, so the interface can render it without further lookups.
 * Options/messages/events are ordered (options & events by position/time,
 * messages chronologically).
 */
export interface HydratedDecision {
  decision: Decision;
  board: Board;
  step: Step;
  priority: Priority;
  questioner: Actor;
  assignee: Actor | null;
  /** Originating session + the agent that ran it; null for manual decisions. */
  session: { session: Session; agent: Actor } | null;
  answeredBy: Actor | null;
  chosenOption: DecisionOption | null;
  options: DecisionOption[];
  messages: HydratedMessage[];
  events: HydratedEvent[];
  tags: Tag[];
}

/** An option to attach to a decision on creation. */
export interface NewOptionData {
  label: string;
  detail: string | null;
  recommended: boolean;
  position: number;
}

/** A timeline event to append (the actor and time are explicit). */
export interface NewEventData {
  actorId: string | null;
  label: string;
  createdAt: Date;
}

/**
 * Everything needed to create a decision. The repository allocates `refNumber`
 * by incrementing the board's `refSeq` inside the same transaction as the
 * insert (invariant 6). `stepId`, `priorityId`, and `tagIds` are pre-resolved
 * to ids that belong to the board.
 */
export interface CreateDecisionData {
  boardId: string;
  title: string | null;
  question: string;
  context: string | null;
  kind: DecisionKind;
  stepId: string;
  priorityId: string;
  questionerId: string;
  assigneeId: string | null;
  questionAt: Date;
  sessionId: string | null;
  tagIds: string[];
  options: NewOptionData[];
  events: NewEventData[];
}

/**
 * Driven port: decisions and their satellites (options, messages, events,
 * tags), returned in the hydrated shape the inbox renders from. Rows never
 * leak inward — adapters map to/from the domain types above.
 */
export interface DecisionRepository {
  /** Hydrated decisions for the given boards (e.g. all active boards). */
  listHydrated(boardIds: string[]): Promise<HydratedDecision[]>;
  /** One hydrated decision, or null if it does not exist. */
  getHydrated(id: string): Promise<HydratedDecision | null>;
  /** Create a decision (+ tags, options, opening event), allocating its ref. */
  create(data: CreateDecisionData): Promise<HydratedDecision>;
  /** Persist the mutable fields of an existing decision (answer, step, …). */
  update(decision: Decision): Promise<void>;
  /** Append timeline events to a decision. */
  appendEvents(decisionId: string, events: NewEventData[]): Promise<void>;
}
