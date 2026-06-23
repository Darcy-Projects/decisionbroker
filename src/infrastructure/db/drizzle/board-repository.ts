import { asc, eq } from "drizzle-orm";
import type { Board } from "@/core/domain/decisions/board";
import type { Step } from "@/core/domain/decisions/step";
import type { Priority } from "@/core/domain/decisions/priority";
import type { Tag } from "@/core/domain/decisions/tag";
import type {
  BoardConfig,
  BoardRepository,
  CreateBoardData,
} from "@/core/ports/board-repository";
import { getDb } from "@/infra/db/drizzle/client";
import {
  boardPriorities,
  boards,
  boardSteps,
  boardTags,
  type BoardPriorityRow,
  type BoardRow,
  type BoardStepRow,
  type BoardTagRow,
} from "@/infra/db/drizzle/schema";

export function boardToDomain(row: BoardRow): Board {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.ownerId,
    color: row.color,
    refPrefix: row.refPrefix,
    refSeq: row.refSeq,
    archived: row.archived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function stepToDomain(row: BoardStepRow): Step {
  return {
    id: row.id,
    boardId: row.boardId,
    name: row.name,
    position: row.position,
    isInitial: row.isInitial,
    isTerminal: row.isTerminal,
  };
}

export function priorityToDomain(row: BoardPriorityRow): Priority {
  return {
    id: row.id,
    boardId: row.boardId,
    name: row.name,
    position: row.position,
    isDefault: row.isDefault,
  };
}

export function tagToDomain(row: BoardTagRow): Tag {
  return { id: row.id, boardId: row.boardId, name: row.name };
}

/** Drizzle/Postgres adapter implementing the BoardRepository port. */
export class DrizzleBoardRepository implements BoardRepository {
  async list(opts?: { includeArchived?: boolean }): Promise<Board[]> {
    const db = getDb();
    const rows = opts?.includeArchived
      ? await db.select().from(boards).orderBy(asc(boards.createdAt))
      : await db
          .select()
          .from(boards)
          .where(eq(boards.archived, false))
          .orderBy(asc(boards.createdAt));
    return rows.map(boardToDomain);
  }

  async findById(id: string): Promise<Board | null> {
    const [row] = await getDb()
      .select()
      .from(boards)
      .where(eq(boards.id, id))
      .limit(1);
    return row ? boardToDomain(row) : null;
  }

  async getConfig(boardId: string): Promise<BoardConfig | null> {
    const db = getDb();
    const [board] = await db
      .select()
      .from(boards)
      .where(eq(boards.id, boardId))
      .limit(1);
    if (!board) return null;

    const [stepRows, priorityRows, tagRows] = await Promise.all([
      db
        .select()
        .from(boardSteps)
        .where(eq(boardSteps.boardId, boardId))
        .orderBy(asc(boardSteps.position)),
      db
        .select()
        .from(boardPriorities)
        .where(eq(boardPriorities.boardId, boardId))
        .orderBy(asc(boardPriorities.position)),
      db
        .select()
        .from(boardTags)
        .where(eq(boardTags.boardId, boardId))
        .orderBy(asc(boardTags.name)),
    ]);

    return {
      board: boardToDomain(board),
      steps: stepRows.map(stepToDomain),
      priorities: priorityRows.map(priorityToDomain),
      tags: tagRows.map(tagToDomain),
    };
  }

  async create(data: CreateBoardData): Promise<BoardConfig> {
    const db = getDb();
    return db.transaction(async (tx) => {
      const [board] = await tx
        .insert(boards)
        .values({
          name: data.name,
          ownerId: data.ownerId,
          color: data.color,
          ...(data.refPrefix ? { refPrefix: data.refPrefix } : {}),
        })
        .returning();

      const stepRows = await tx
        .insert(boardSteps)
        .values(
          data.steps.map((s) => ({
            boardId: board.id,
            name: s.name,
            position: s.position,
            isInitial: s.isInitial,
            isTerminal: s.isTerminal,
          })),
        )
        .returning();

      const priorityRows = await tx
        .insert(boardPriorities)
        .values(
          data.priorities.map((p) => ({
            boardId: board.id,
            name: p.name,
            position: p.position,
            isDefault: p.isDefault,
          })),
        )
        .returning();

      return {
        board: boardToDomain(board),
        steps: stepRows.map(stepToDomain),
        priorities: priorityRows.map(priorityToDomain),
        tags: [],
      };
    });
  }

  async rename(boardId: string, name: string): Promise<void> {
    await getDb()
      .update(boards)
      .set({ name, updatedAt: new Date() })
      .where(eq(boards.id, boardId));
  }

  async setArchived(boardId: string, archived: boolean): Promise<void> {
    await getDb()
      .update(boards)
      .set({ archived, updatedAt: new Date() })
      .where(eq(boards.id, boardId));
  }
}
