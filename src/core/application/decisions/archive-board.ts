import type { BoardRepository } from "@/core/ports/board-repository";

/** Raised when the requested board does not exist. */
export class BoardNotFoundError extends Error {
  constructor(public readonly boardId: string) {
    super(`Board not found: ${boardId}`);
    this.name = "BoardNotFoundError";
  }
}

export interface ArchiveBoardDeps {
  boards: BoardRepository;
}

/**
 * Application service: soft-archive (or restore) a board. Archiving hides the
 * board and its decisions from the active inbox but preserves every row — only
 * boards archive (invariant 7).
 */
export function makeArchiveBoard(deps: ArchiveBoardDeps) {
  return async function archiveBoard(
    boardId: string,
    archived = true,
  ): Promise<void> {
    const board = await deps.boards.findById(boardId);
    if (!board) throw new BoardNotFoundError(boardId);
    await deps.boards.setArchived(boardId, archived);
  };
}

export type ArchiveBoard = ReturnType<typeof makeArchiveBoard>;
