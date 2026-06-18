import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { Decision } from "@/core/domain/decisions/decision";
import type { DecisionOption } from "@/core/domain/decisions/option";
import type { DecisionMessage } from "@/core/domain/decisions/message";
import type { DecisionEvent } from "@/core/domain/decisions/event";
import type { Session } from "@/core/domain/decisions/session";
import type {
  CreateDecisionData,
  DecisionRepository,
  HydratedDecision,
  NewEventData,
} from "@/core/ports/decision-repository";
import { getDb } from "@/infra/db/drizzle/client";
import {
  actorToDomain,
} from "@/infra/db/drizzle/actor-repository";
import {
  boardToDomain,
  priorityToDomain,
  stepToDomain,
  tagToDomain,
} from "@/infra/db/drizzle/board-repository";
import {
  actors,
  boardPriorities,
  boards,
  boardSteps,
  boardTags,
  decisionEvents,
  decisionMessages,
  decisionOptions,
  decisionTags,
  decisions,
  sessions,
  type DecisionOptionRow,
  type DecisionRow,
} from "@/infra/db/drizzle/schema";

function decisionToDomain(row: DecisionRow): Decision {
  return {
    id: row.id,
    boardId: row.boardId,
    refNumber: row.refNumber,
    title: row.title,
    question: row.question,
    context: row.context,
    kind: row.kind,
    stepId: row.stepId,
    priorityId: row.priorityId,
    questionerId: row.questionerId,
    assigneeId: row.assigneeId,
    questionAt: row.questionAt,
    sessionId: row.sessionId,
    autoResolved: row.autoResolved,
    answerText: row.answerText,
    chosenOptionId: row.chosenOptionId,
    answeredById: row.answeredById,
    answeredAt: row.answeredAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function optionToDomain(row: DecisionOptionRow): DecisionOption {
  return {
    id: row.id,
    decisionId: row.decisionId,
    label: row.label,
    detail: row.detail,
    recommended: row.recommended,
    position: row.position,
  };
}

/** Drizzle/Postgres adapter implementing the DecisionRepository port. */
export class DrizzleDecisionRepository implements DecisionRepository {
  async listHydrated(boardIds: string[]): Promise<HydratedDecision[]> {
    if (boardIds.length === 0) return [];
    const rows = await getDb()
      .select()
      .from(decisions)
      .where(inArray(decisions.boardId, boardIds))
      .orderBy(desc(decisions.questionAt));
    return this.hydrate(rows);
  }

  async getHydrated(id: string): Promise<HydratedDecision | null> {
    const [row] = await getDb()
      .select()
      .from(decisions)
      .where(eq(decisions.id, id))
      .limit(1);
    if (!row) return null;
    const [hydrated] = await this.hydrate([row]);
    return hydrated ?? null;
  }

  async create(data: CreateDecisionData): Promise<HydratedDecision> {
    const db = getDb();
    const id = await db.transaction(async (tx) => {
      // Allocate the next per-board ref number atomically (invariant 6).
      const [{ refNumber }] = await tx
        .update(boards)
        .set({ refSeq: sql`${boards.refSeq} + 1` })
        .where(eq(boards.id, data.boardId))
        .returning({ refNumber: boards.refSeq });

      const [decision] = await tx
        .insert(decisions)
        .values({
          boardId: data.boardId,
          refNumber,
          title: data.title,
          question: data.question,
          context: data.context,
          kind: data.kind,
          stepId: data.stepId,
          priorityId: data.priorityId,
          questionerId: data.questionerId,
          assigneeId: data.assigneeId,
          questionAt: data.questionAt,
          sessionId: data.sessionId,
        })
        .returning();

      if (data.options.length > 0) {
        await tx.insert(decisionOptions).values(
          data.options.map((o) => ({
            decisionId: decision.id,
            label: o.label,
            detail: o.detail,
            recommended: o.recommended,
            position: o.position,
          })),
        );
      }

      if (data.tagIds.length > 0) {
        await tx.insert(decisionTags).values(
          data.tagIds.map((tagId) => ({ decisionId: decision.id, tagId })),
        );
      }

      if (data.events.length > 0) {
        await tx.insert(decisionEvents).values(
          data.events.map((e) => ({
            decisionId: decision.id,
            actorId: e.actorId,
            label: e.label,
            createdAt: e.createdAt,
          })),
        );
      }

      return decision.id;
    });

    const hydrated = await this.getHydrated(id);
    if (!hydrated) throw new Error(`Decision vanished after create: ${id}`);
    return hydrated;
  }

  async update(decision: Decision): Promise<void> {
    await getDb()
      .update(decisions)
      .set({
        title: decision.title,
        question: decision.question,
        context: decision.context,
        kind: decision.kind,
        stepId: decision.stepId,
        priorityId: decision.priorityId,
        assigneeId: decision.assigneeId,
        autoResolved: decision.autoResolved,
        answerText: decision.answerText,
        chosenOptionId: decision.chosenOptionId,
        answeredById: decision.answeredById,
        answeredAt: decision.answeredAt,
        updatedAt: decision.updatedAt,
      })
      .where(eq(decisions.id, decision.id));
  }

  async appendEvents(
    decisionId: string,
    events: NewEventData[],
  ): Promise<void> {
    if (events.length === 0) return;
    await getDb()
      .insert(decisionEvents)
      .values(
        events.map((e) => ({
          decisionId,
          actorId: e.actorId,
          label: e.label,
          createdAt: e.createdAt,
        })),
      );
  }

  /**
   * Assemble HydratedDecision[] from raw decision rows, batch-loading every
   * related entity (no N+1). Order of the input rows is preserved.
   */
  private async hydrate(rows: DecisionRow[]): Promise<HydratedDecision[]> {
    if (rows.length === 0) return [];
    const db = getDb();

    const decisionIds = rows.map((r) => r.id);
    const boardIds = unique(rows.map((r) => r.boardId));
    const stepIds = unique(rows.map((r) => r.stepId));
    const priorityIds = unique(rows.map((r) => r.priorityId));
    const sessionIds = unique(
      rows.map((r) => r.sessionId).filter((v): v is string => v !== null),
    );

    const [
      optionRows,
      messageRows,
      eventRows,
      decisionTagRows,
      boardRows,
      stepRows,
      priorityRows,
      sessionRows,
    ] = await Promise.all([
      db
        .select()
        .from(decisionOptions)
        .where(inArray(decisionOptions.decisionId, decisionIds))
        .orderBy(asc(decisionOptions.position)),
      db
        .select()
        .from(decisionMessages)
        .where(inArray(decisionMessages.decisionId, decisionIds))
        .orderBy(asc(decisionMessages.createdAt)),
      db
        .select()
        .from(decisionEvents)
        .where(inArray(decisionEvents.decisionId, decisionIds))
        .orderBy(asc(decisionEvents.createdAt)),
      db
        .select()
        .from(decisionTags)
        .where(inArray(decisionTags.decisionId, decisionIds)),
      db.select().from(boards).where(inArray(boards.id, boardIds)),
      db.select().from(boardSteps).where(inArray(boardSteps.id, stepIds)),
      db
        .select()
        .from(boardPriorities)
        .where(inArray(boardPriorities.id, priorityIds)),
      sessionIds.length
        ? db.select().from(sessions).where(inArray(sessions.id, sessionIds))
        : Promise.resolve([] as (typeof sessions.$inferSelect)[]),
    ]);

    const tagIds = unique(decisionTagRows.map((t) => t.tagId));
    const actorIds = unique([
      ...rows.map((r) => r.questionerId),
      ...rows.map((r) => r.assigneeId),
      ...rows.map((r) => r.answeredById),
      ...messageRows.map((m) => m.authorId),
      ...eventRows.map((e) => e.actorId),
      ...sessionRows.map((s) => s.agentId),
    ].filter((v): v is string => v != null));

    const [tagRows, actorRows] = await Promise.all([
      tagIds.length
        ? db.select().from(boardTags).where(inArray(boardTags.id, tagIds))
        : Promise.resolve([] as (typeof boardTags.$inferSelect)[]),
      actorIds.length
        ? db.select().from(actors).where(inArray(actors.id, actorIds))
        : Promise.resolve([] as (typeof actors.$inferSelect)[]),
    ]);

    // Index everything by id / decision id for assembly.
    const boardById = byId(boardRows.map(boardToDomain));
    const stepById = byId(stepRows.map(stepToDomain));
    const priorityById = byId(priorityRows.map(priorityToDomain));
    const actorById = byId(actorRows.map(actorToDomain));
    const tagById = byId(tagRows.map(tagToDomain));
    const sessionById = new Map<string, Session>(
      sessionRows.map((s) => [
        s.id,
        {
          id: s.id,
          name: s.name,
          project: s.project,
          agentId: s.agentId,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        },
      ]),
    );

    const optionsByDecision = groupBy(
      optionRows.map(optionToDomain),
      (o) => o.decisionId,
    );
    const messagesByDecision = groupBy(
      messageRows.map(
        (m): DecisionMessage => ({
          id: m.id,
          decisionId: m.decisionId,
          authorId: m.authorId,
          body: m.body,
          createdAt: m.createdAt,
        }),
      ),
      (m) => m.decisionId,
    );
    const eventsByDecision = groupBy(
      eventRows.map(
        (e): DecisionEvent => ({
          id: e.id,
          decisionId: e.decisionId,
          actorId: e.actorId,
          label: e.label,
          createdAt: e.createdAt,
        }),
      ),
      (e) => e.decisionId,
    );
    const tagIdsByDecision = groupBy(
      decisionTagRows.map((t) => ({ decisionId: t.decisionId, tagId: t.tagId })),
      (t) => t.decisionId,
    );

    return rows.map((row): HydratedDecision => {
      const decision = decisionToDomain(row);
      const board = boardById.get(row.boardId);
      const step = stepById.get(row.stepId);
      const priority = priorityById.get(row.priorityId);
      if (!board || !step || !priority) {
        throw new Error(
          `Decision ${row.id} references missing board/step/priority`,
        );
      }
      const questioner = actorById.get(row.questionerId);
      if (!questioner) {
        throw new Error(`Decision ${row.id} references missing questioner`);
      }
      const options = optionsByDecision.get(row.id) ?? [];
      const sessionRow = row.sessionId
        ? sessionById.get(row.sessionId)
        : undefined;
      const sessionAgent = sessionRow
        ? actorById.get(sessionRow.agentId)
        : undefined;

      return {
        decision,
        board,
        step,
        priority,
        questioner,
        assignee: row.assigneeId
          ? (actorById.get(row.assigneeId) ?? null)
          : null,
        session:
          sessionRow && sessionAgent
            ? { session: sessionRow, agent: sessionAgent }
            : null,
        answeredBy: row.answeredById
          ? (actorById.get(row.answeredById) ?? null)
          : null,
        chosenOption: row.chosenOptionId
          ? (options.find((o) => o.id === row.chosenOptionId) ?? null)
          : null,
        options,
        messages: (messagesByDecision.get(row.id) ?? []).map((message) => ({
          message,
          author: actorById.get(message.authorId)!,
        })),
        events: (eventsByDecision.get(row.id) ?? []).map((event) => ({
          event,
          actor: event.actorId
            ? (actorById.get(event.actorId) ?? null)
            : null,
        })),
        tags: (tagIdsByDecision.get(row.id) ?? [])
          .map((t) => tagById.get(t.tagId))
          .filter((t): t is NonNullable<typeof t> => t != null),
      };
    });
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}
