import {
  DEFAULT_PRIORITIES,
  DEFAULT_STEPS,
} from "@/core/domain/decisions/board";
import type { BoardConfig, BoardRepository } from "@/core/ports/board-repository";

export interface CreateBoardInput {
  name: string;
  ownerId: string;
  color: string;
  refPrefix?: string;
}

export interface CreateBoardDeps {
  boards: BoardRepository;
}

/**
 * Application service: create a board and seed its initial workflow — the two
 * default steps (Decision needed → Answered) and four default priorities
 * (Medium default). No tags are seeded (lifecycle note in data-model §5).
 */
export function makeCreateBoard(deps: CreateBoardDeps) {
  return async function createBoard(
    input: CreateBoardInput,
  ): Promise<BoardConfig> {
    return deps.boards.create({
      name: input.name,
      ownerId: input.ownerId,
      color: input.color,
      refPrefix: input.refPrefix,
      steps: DEFAULT_STEPS,
      priorities: DEFAULT_PRIORITIES,
    });
  };
}

export type CreateBoard = ReturnType<typeof makeCreateBoard>;
