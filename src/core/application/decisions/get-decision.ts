import type {
  DecisionRepository,
  HydratedDecision,
} from "@/core/ports/decision-repository";

/** Raised when the requested decision does not exist. */
export class DecisionNotFoundError extends Error {
  constructor(public readonly decisionId: string) {
    super(`Decision not found: ${decisionId}`);
    this.name = "DecisionNotFoundError";
  }
}

export interface GetDecisionDeps {
  decisions: DecisionRepository;
}

/**
 * Application service: fetch one hydrated decision (with its options, messages,
 * timeline, and tags) for the detail view.
 */
export function makeGetDecision(deps: GetDecisionDeps) {
  return async function getDecision(id: string): Promise<HydratedDecision> {
    const hydrated = await deps.decisions.getHydrated(id);
    if (!hydrated) throw new DecisionNotFoundError(id);
    return hydrated;
  };
}

export type GetDecision = ReturnType<typeof makeGetDecision>;
