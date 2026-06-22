import type { Board } from "@/core/domain/decisions/board";
import type { BoardRepository } from "@/core/ports/board-repository";

export interface ListBoardsDeps {
  boards: BoardRepository;
}

/**
 * Application service: list boards. Returns active boards by default; pass
 * `includeArchived` to include archived ones (the inbox shows both, in separate
 * sidebar sections).
 */
export function makeListBoards(deps: ListBoardsDeps) {
  return async function listBoards(opts?: {
    includeArchived?: boolean;
  }): Promise<Board[]> {
    return deps.boards.list(opts);
  };
}

export type ListBoards = ReturnType<typeof makeListBoards>;
