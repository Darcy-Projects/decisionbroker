import { eq } from "drizzle-orm";
import type { Session } from "@/core/domain/decisions/session";
import type {
  CreateSessionData,
  SessionRepository,
} from "@/core/ports/session-repository";
import { getDb } from "@/infra/db/drizzle/client";
import { sessions, type SessionRow } from "@/infra/db/drizzle/schema";

// Map the Drizzle row to the core's domain type, so the schema can drift from
// the domain without leaking storage concerns inward.
export function sessionToDomain(row: SessionRow): Session {
  return {
    id: row.id,
    name: row.name,
    project: row.project,
    agentId: row.agentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Drizzle/Postgres adapter implementing the SessionRepository port. */
export class DrizzleSessionRepository implements SessionRepository {
  async create(data: CreateSessionData): Promise<Session> {
    const [row] = await getDb()
      .insert(sessions)
      .values({
        name: data.name,
        project: data.project,
        agentId: data.agentId,
      })
      .returning();
    return sessionToDomain(row);
  }

  async findById(id: string): Promise<Session | null> {
    const [row] = await getDb()
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);
    return row ? sessionToDomain(row) : null;
  }
}
