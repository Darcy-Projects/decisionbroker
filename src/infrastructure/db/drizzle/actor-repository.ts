import { asc, eq } from "drizzle-orm";
import type { Actor } from "@/core/domain/decisions/actor";
import type { ActorRepository } from "@/core/ports/actor-repository";
import { getDb } from "@/infra/db/drizzle/client";
import { actors, type ActorRow } from "@/infra/db/drizzle/schema";

// Map the Drizzle row to the core's domain type. Explicit so the schema can
// drift from the domain without leaking storage concerns inward.
export function actorToDomain(row: ActorRow): Actor {
  return {
    id: row.id,
    kind: row.kind,
    displayName: row.displayName,
    role: row.role,
    workosUserId: row.workosUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Drizzle/Postgres adapter implementing the ActorRepository port. */
export class DrizzleActorRepository implements ActorRepository {
  async list(): Promise<Actor[]> {
    const rows = await getDb()
      .select()
      .from(actors)
      .orderBy(asc(actors.displayName));
    return rows.map(actorToDomain);
  }

  async findById(id: string): Promise<Actor | null> {
    const [row] = await getDb()
      .select()
      .from(actors)
      .where(eq(actors.id, id))
      .limit(1);
    return row ? actorToDomain(row) : null;
  }
}
