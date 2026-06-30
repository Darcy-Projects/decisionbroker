import type { Actor } from "@/core/domain/decisions/actor";
import type { ActorRepository } from "@/core/ports/actor-repository";

export interface ListActorsDeps {
  actors: ActorRepository;
}

/** Application service: list all actors (people and agents). */
export function makeListActors(deps: ListActorsDeps) {
  return async function listActors(): Promise<Actor[]> {
    return deps.actors.list();
  };
}

export type ListActors = ReturnType<typeof makeListActors>;
