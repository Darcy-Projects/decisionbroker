// Server-side read path for the inbox. Calls the application services through
// the composition root and maps the hydrated domain shapes to the interface
// view models. Used by the inbox page (SSR) and the GET /api/inbox handler.
//
// This module is server-only (it reaches the container/DB); never import it
// into a client component — it would pull the database adapters into the bundle.

import { services } from "@/infra/config/container";
import {
  toBoardView,
  toDecisionView,
  toPersonView,
  type InboxData,
} from "@/app/lib/decisions";

export async function loadInboxData(): Promise<InboxData> {
  const now = new Date();
  const [allBoards, actors, hydrated] = await Promise.all([
    services.listBoards({ includeArchived: true }),
    services.listActors(),
    services.listInbox({ includeArchived: true }),
  ]);

  return {
    boards: allBoards.filter((b) => !b.archived).map(toBoardView),
    archivedBoards: allBoards.filter((b) => b.archived).map(toBoardView),
    // The assignee pickers offer people (human actors).
    people: actors.filter((a) => a.kind === "user").map(toPersonView),
    decisions: hydrated.map((h) => toDecisionView(h, now)),
  };
}
