// Domain model for a decision — the inbox item at the heart of the model: a
// question raised by an actor, sitting on a board step, waiting to be answered.
// Pure types + rules, no I/O.

import type { Board } from "./board";

export type DecisionKind =
  | "approval"
  | "choice"
  | "judgment"
  | "clarification"
  | "escalation";

export interface Decision {
  id: string;
  boardId: string;
  refNumber: number;
  /** Short label; UI falls back to a truncated question when null. */
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
  /** True = resolved by a rule (still lands on the terminal step). */
  autoResolved: boolean;
  answerText: string | null;
  chosenOptionId: string | null;
  answeredById: string | null;
  answeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Display ref, e.g. `DEC-2041`. */
export function refLabel(
  board: Pick<Board, "refPrefix">,
  decision: Pick<Decision, "refNumber">,
): string {
  return `${board.refPrefix}${decision.refNumber}`;
}

/**
 * A decision is considered answered when it sits on its board's terminal step.
 * (Workflow position is the source of truth; `answeredAt` is the supporting
 * detail.)
 */
export function isAnswered(
  decision: Pick<Decision, "stepId">,
  terminalStepId: string,
): boolean {
  return decision.stepId === terminalStepId;
}

/** Raised when an answer carries neither answer text nor a chosen option. */
export class AnswerContentRequiredError extends Error {
  constructor() {
    super("An answer requires answer text and/or a chosen option.");
    this.name = "AnswerContentRequiredError";
  }
}

export interface AnswerInput {
  answerText?: string | null;
  chosenOptionId?: string | null;
  answeredById: string;
  /** The board's terminal step the decision moves onto. */
  terminalStepId: string;
  now: Date;
  /** Mark machine resolution. */
  autoResolved?: boolean;
}

/**
 * Business rule: answer a decision. Records the answer text and/or chosen
 * option, who answered and when, and moves it onto the terminal step. At least
 * one of text/option must be present (invariant 5). Pure — time and identities
 * are injected so it stays deterministic/testable. Validating that the chosen
 * option belongs to this decision needs the option set, so it is enforced by
 * the use case, not here.
 */
export function answer(decision: Decision, input: AnswerInput): Decision {
  const text = input.answerText?.trim() ? input.answerText.trim() : null;
  const chosenOptionId = input.chosenOptionId ?? null;
  if (!text && !chosenOptionId) {
    throw new AnswerContentRequiredError();
  }
  return {
    ...decision,
    answerText: text,
    chosenOptionId,
    answeredById: input.answeredById,
    answeredAt: input.now,
    autoResolved: input.autoResolved ?? decision.autoResolved,
    stepId: input.terminalStepId,
    updatedAt: input.now,
  };
}
