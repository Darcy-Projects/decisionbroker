import type { Actor } from "@/core/domain/decisions/actor";

/**
 * Driven port: what the core needs from "wherever actors are stored". The
 * dev-only "current user" is resolved by the composition root (which holds the
 * chosen actor id) via `findById`; once WorkOS lands, lookups will key off
 * `workosUserId` instead.
 */
export interface ActorRepository {
  list(): Promise<Actor[]>;
  findById(id: string): Promise<Actor | null>;
}
