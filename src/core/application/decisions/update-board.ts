import type { Board } from "@/core/domain/decisions/board";
import type { BoardRepository } from "@/core/ports/board-repository";
import { BoardNotFoundError } from "./archive-board";

export interface UpdateBoardInput {
  boardId: string;
  /** New board name; trimmed and required (validated at the edge). */
  name: string;
}

export interface UpdateBoardDeps {
  boards: BoardRepository;
}

/**
 * Application service: rename a board. This sprint only changes `name`; the
 * Edit-board popup persists a rename and (read-only) shows the board id. Other
 * board fields (color, workflow) get their own update paths later.
 */
export function makeUpdateBoard(deps: UpdateBoardDeps) {
  return async function updateBoard(input: UpdateBoardInput): Promise<Board> {
    const existing = await deps.boards.findById(input.boardId);
    if (!existing) throw new BoardNotFoundError(input.boardId);
    await deps.boards.rename(input.boardId, input.name.trim());
    const updated = await deps.boards.findById(input.boardId);
    // The board exists (just renamed); fall back defensively.
    return updated ?? existing;
  };
}

export type UpdateBoard = ReturnType<typeof makeUpdateBoard>;
