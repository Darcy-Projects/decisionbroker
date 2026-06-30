import { normalizeTagName } from "@/core/domain/decisions/tag";
import type { Actor } from "@/core/domain/decisions/actor";
import type { Clock } from "@/core/ports/clock";
import type { ActorRepository } from "@/core/ports/actor-repository";
import type { BoardRepository } from "@/core/ports/board-repository";
import type { SessionRepository } from "@/core/ports/session-repository";
import type {
  DecisionRepository,
  HydratedDecision,
} from "@/core/ports/decision-repository";
import { BoardNotFoundError } from "./archive-board";
import { SessionNotFoundError } from "./ensure-session";

/** Raised when a tag is not in the board's allowed set. */
export class TagNotAllowedError extends Error {
  constructor(
    public readonly boardId: string,
    public readonly tag: string,
  ) {
    super(`Tag "${tag}" is not allowed on board ${boardId}`);
    this.name = "TagNotAllowedError";
  }
}

/** Raised when a board has no initial step or no default priority configured. */
export class BoardNotConfiguredError extends Error {
  constructor(
    public readonly boardId: string,
    detail: string,
  ) {
    super(`Board ${boardId} is not configured: ${detail}`);
    this.name = "BoardNotConfiguredError";
  }
}

/** Matches `AddDecisionDialog`'s NewDecisionInput plus the board context. */
export interface CreateDecisionInput {
  boardId: string;
  question: string;
  assigneeId: string | null;
  /** Raw tag strings; validated/normalized against the board's allowed set. */
  tags: string[];
  /**
   * Optional originating session (e.g. a Claude Code launch). When present the
   * questioner becomes that session's agent and the decision links to it; when
   * absent the questioner is the dev current user (the Add dialog path).
   */
  sessionId?: string | null;
}

export interface CreateDecisionDeps {
  boards: BoardRepository;
  decisions: DecisionRepository;
  actors: ActorRepository;
  sessions: SessionRepository;
  clock: Clock;
  /** Dev-only "current user" actor id, chosen by the composition root. */
  currentUserId: () => string;
}

/**
 * Application service: create a decision from the inbox's Add dialog. Fills the
 * defaults the data model requires — the board's initial step and default
 * priority, the next ref (allocated by the repository in-transaction), the
 * current actor as questioner, and an opening timeline event. Validates that
 * every tag belongs to the board's allowed set before writing.
 */
export function makeCreateDecision(deps: CreateDecisionDeps) {
  return async function createDecision(
    input: CreateDecisionInput,
  ): Promise<HydratedDecision> {
    const config = await deps.boards.getConfig(input.boardId);
    if (!config) throw new BoardNotFoundError(input.boardId);

    const initialStep = config.steps.find((s) => s.isInitial);
    if (!initialStep) {
      throw new BoardNotConfiguredError(input.boardId, "no initial step");
    }
    const defaultPriority = config.priorities.find((p) => p.isDefault);
    if (!defaultPriority) {
      throw new BoardNotConfiguredError(input.boardId, "no default priority");
    }

    // Validate + resolve tags against the board's allowed set.
    const tagIds: string[] = [];
    for (const raw of input.tags) {
      const name = normalizeTagName(raw);
      if (!name) continue;
      const allowed = config.tags.find((t) => t.name === name);
      if (!allowed) throw new TagNotAllowedError(input.boardId, name);
      if (!tagIds.includes(allowed.id)) tagIds.push(allowed.id);
    }

    // Resolve the questioner: the session's agent when raised by a session
    // (e.g. the channel), otherwise the dev current user (the Add dialog).
    let questioner: Actor;
    let sessionId: string | null = null;
    if (input.sessionId) {
      const session = await deps.sessions.findById(input.sessionId);
      if (!session) throw new SessionNotFoundError(input.sessionId);
      const agent = await deps.actors.findById(session.agentId);
      if (!agent) {
        throw new Error(`Session agent actor not found: ${session.agentId}`);
      }
      questioner = agent;
      sessionId = session.id;
    } else {
      const currentUserId = deps.currentUserId();
      const currentUser = await deps.actors.findById(currentUserId);
      if (!currentUser) {
        throw new Error(`Current user actor not found: ${currentUserId}`);
      }
      questioner = currentUser;
    }

    const now = deps.clock.now();
    return deps.decisions.create({
      boardId: input.boardId,
      // UI falls back to a truncated question when the title is null.
      title: null,
      question: input.question.trim(),
      context: null,
      kind: "approval",
      stepId: initialStep.id,
      priorityId: defaultPriority.id,
      questionerId: questioner.id,
      assigneeId: input.assigneeId,
      questionAt: now,
      sessionId,
      tagIds,
      options: [],
      events: [
        {
          actorId: questioner.id,
          label: `Question raised by ${questioner.displayName}`,
          createdAt: now,
        },
      ],
    });
  };
}

export type CreateDecision = ReturnType<typeof makeCreateDecision>;
