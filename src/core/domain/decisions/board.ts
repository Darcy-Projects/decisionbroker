// Domain model for a board — a team/domain workspace that owns its own
// configurable workflow (steps), priorities, and allowed tags. Only boards
// soft-archive; archiving hides a board and its decisions from the active inbox
// while preserving every row.

export interface Board {
  id: string;
  name: string;
  ownerId: string;
  /** Tailwind color token, e.g. `bg-primary`. */
  color: string;
  refPrefix: string;
  /** Last issued ref number (per board). */
  refSeq: number;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Shape of a step to seed when a board is created. */
export interface StepSeed {
  name: string;
  position: number;
  isInitial: boolean;
  isTerminal: boolean;
}

/** Shape of a priority to seed when a board is created. */
export interface PrioritySeed {
  name: string;
  position: number;
  isDefault: boolean;
}

/**
 * Steps every new board starts with: a "Decision needed" entry step and an
 * "Answered" terminal step. Custom stages are inserted between them later.
 */
export const DEFAULT_STEPS: readonly StepSeed[] = [
  { name: "Decision needed", position: 0, isInitial: true, isTerminal: false },
  { name: "Answered", position: 1, isInitial: false, isTerminal: true },
];

/**
 * Priorities every new board starts with. `Medium` is the default a new
 * decision receives until a user reorders or customizes them.
 */
export const DEFAULT_PRIORITIES: readonly PrioritySeed[] = [
  { name: "Low", position: 0, isDefault: false },
  { name: "Medium", position: 1, isDefault: true },
  { name: "High", position: 2, isDefault: false },
  { name: "Critical", position: 3, isDefault: false },
];
