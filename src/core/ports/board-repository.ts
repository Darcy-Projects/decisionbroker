import type { Board, PrioritySeed, StepSeed } from "@/core/domain/decisions/board";
import type { Step } from "@/core/domain/decisions/step";
import type { Priority } from "@/core/domain/decisions/priority";
import type { Tag } from "@/core/domain/decisions/tag";

/** A board together with its configurable steps, priorities, and allowed tags. */
export interface BoardConfig {
  board: Board;
  steps: Step[];
  priorities: Priority[];
  tags: Tag[];
}

/** Everything needed to create a board and seed its initial config. */
export interface CreateBoardData {
  name: string;
  ownerId: string;
  color: string;
  refPrefix?: string;
  steps: readonly StepSeed[];
  priorities: readonly PrioritySeed[];
}

/**
 * Driven port: boards and their per-board configuration (steps, priorities,
 * tags), including creation-with-seeding and the soft-archive flag.
 */
export interface BoardRepository {
  /** Active boards by default; pass `includeArchived` to include archived ones. */
  list(opts?: { includeArchived?: boolean }): Promise<Board[]>;
  findById(id: string): Promise<Board | null>;
  /** A board plus its steps/priorities/tags, or null if it does not exist. */
  getConfig(boardId: string): Promise<BoardConfig | null>;
  /** Insert a board and seed its steps + priorities atomically. */
  create(data: CreateBoardData): Promise<BoardConfig>;
  /** Rename a board (the only board field editable this sprint). */
  rename(boardId: string, name: string): Promise<void>;
  setArchived(boardId: string, archived: boolean): Promise<void>;
}
