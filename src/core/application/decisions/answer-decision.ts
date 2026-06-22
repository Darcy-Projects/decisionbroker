import { answer } from "@/core/domain/decisions/decision";
import type { Clock } from "@/core/ports/clock";
import type { BoardRepository } from "@/core/ports/board-repository";
import type {
  DecisionRepository,
  HydratedDecision,
  NewEventData,
} from "@/core/ports/decision-repository";
import { BoardNotConfiguredError } from "./create-decision";
import { DecisionNotFoundError } from "./get-decision";

/** Raised when a chosen option does not belong to the decision being answered. */
export class OptionNotForDecisionError extends Error {
  constructor(
    public readonly decisionId: string,
    public readonly optionId: string,
  ) {
    super(`Option ${optionId} does not belong to decision ${decisionId}`);
    this.name = "OptionNotForDecisionError";
  }
}

export interface AnswerDecisionInput {
  decisionId: string;
  answerText?: string | null;
  chosenOptionId?: string | null;
  autoResolved?: boolean;
}

export interface AnswerDecisionDeps {
  boards: BoardRepository;
  decisions: DecisionRepository;
  clock: Clock;
  /** Dev-only "current user" actor id, chosen by the composition root. */
  currentUserId: () => string;
}

/** Short, human summary of an answer for the timeline label. */
function summarize(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
}

/**
 * Application service: answer a decision. Validates the chosen option belongs to
 * the decision (invariant 4), applies the domain `answer` rule (which requires
 * text and/or an option and moves the decision onto the terminal step), persists
 * it, and appends the "Answered …" + "Answer returned to session" timeline
 * events. Returns the re-hydrated decision.
 */
export function makeAnswerDecision(deps: AnswerDecisionDeps) {
  return async function answerDecision(
    input: AnswerDecisionInput,
  ): Promise<HydratedDecision> {
    const hydrated = await deps.decisions.getHydrated(input.decisionId);
    if (!hydrated) throw new DecisionNotFoundError(input.decisionId);

    const config = await deps.boards.getConfig(hydrated.decision.boardId);
    const terminalStep = config?.steps.find((s) => s.isTerminal);
    if (!terminalStep) {
      throw new BoardNotConfiguredError(
        hydrated.decision.boardId,
        "no terminal step",
      );
    }

    const chosenOptionId = input.chosenOptionId ?? null;
    if (
      chosenOptionId &&
      !hydrated.options.some((o) => o.id === chosenOptionId)
    ) {
      throw new OptionNotForDecisionError(input.decisionId, chosenOptionId);
    }

    const currentUserId = deps.currentUserId();
    const now = deps.clock.now();
    const answered = answer(hydrated.decision, {
      answerText: input.answerText,
      chosenOptionId,
      answeredById: currentUserId,
      terminalStepId: terminalStep.id,
      now,
      autoResolved: input.autoResolved,
    });
    await deps.decisions.update(answered);

    const chosenLabel = chosenOptionId
      ? hydrated.options.find((o) => o.id === chosenOptionId)?.label
      : undefined;
    const summary = summarize(
      answered.answerText ?? chosenLabel ?? "decision answered",
    );
    const events: NewEventData[] = [
      { actorId: currentUserId, label: `Answered: ${summary}`, createdAt: now },
      { actorId: null, label: "Answer returned to session", createdAt: now },
    ];
    await deps.decisions.appendEvents(input.decisionId, events);

    const refreshed = await deps.decisions.getHydrated(input.decisionId);
    // The decision exists (just updated); fall back defensively.
    return refreshed ?? hydrated;
  };
}

export type AnswerDecision = ReturnType<typeof makeAnswerDecision>;
