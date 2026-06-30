import type { BoardRepository } from "@/core/ports/board-repository";
import type {
  DecisionRepository,
  HydratedDecision,
} from "@/core/ports/decision-repository";

export interface ListInboxDeps {
  boards: BoardRepository;
  decisions: DecisionRepository;
}

export interface ListInboxOptions {
  /** Limit to a single board; omit to list across boards. */
  boardId?: string;
  /** When listing across boards, include archived boards too (default false). */
  includeArchived?: boolean;
}

/**
 * Application service: the inbox read path. Returns hydrated decisions for one
 * board, or across all boards when no board is given. By default archived
 * boards (and their decisions) are excluded; pass `includeArchived` to include
 * them (the inbox shows archived boards in a separate sidebar section).
 */
export function makeListInbox(deps: ListInboxDeps) {
  return async function listInbox(
    opts: ListInboxOptions = {},
  ): Promise<HydratedDecision[]> {
    if (opts.boardId) {
      return deps.decisions.listHydrated([opts.boardId]);
    }
    const boards = await deps.boards.list({
      includeArchived: opts.includeArchived,
    });
    return deps.decisions.listHydrated(boards.map((b) => b.id));
  };
}

export type ListInbox = ReturnType<typeof makeListInbox>;
