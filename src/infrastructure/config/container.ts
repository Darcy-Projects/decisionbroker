// Composition root — the ONE place that knows about both the core and the
// concrete adapters. It chooses which adapter implements each port and wires the
// application services. Swapping the database/file host per deployment (or per
// customer) happens here, by selecting a different adapter — the core and the
// interface tier never change.
//
// This module lives under infrastructure/config so the interface tier can import
// the wired `services` without ever importing a data-tier adapter (db/storage/
// auth) directly. See docs/live/architecture.md for the boundary rules.

import { makeArchiveFile } from "@/core/application/files/archive-file";
import { makeListActors } from "@/core/application/decisions/list-actors";
import { makeListBoards } from "@/core/application/decisions/list-boards";
import { makeCreateBoard } from "@/core/application/decisions/create-board";
import { makeArchiveBoard } from "@/core/application/decisions/archive-board";
import { makeListInbox } from "@/core/application/decisions/list-inbox";
import { makeGetDecision } from "@/core/application/decisions/get-decision";
import { makeCreateDecision } from "@/core/application/decisions/create-decision";
import { makeAnswerDecision } from "@/core/application/decisions/answer-decision";
import { DrizzleFileRepository } from "@/infra/db/drizzle/file-repository";
import { DrizzleActorRepository } from "@/infra/db/drizzle/actor-repository";
import { DrizzleBoardRepository } from "@/infra/db/drizzle/board-repository";
import { DrizzleDecisionRepository } from "@/infra/db/drizzle/decision-repository";
import { SystemClock } from "@/infra/clock/system-clock";
import { seedInbox } from "@/infra/db/drizzle/seed";
import { DEV_CURRENT_USER_ID } from "@/infra/config/dev-user";

const fileRepository = new DrizzleFileRepository();
const actorRepository = new DrizzleActorRepository();
const boardRepository = new DrizzleBoardRepository();
const decisionRepository = new DrizzleDecisionRepository();
const clock = new SystemClock();

// Dev-only identity selection. A later sprint resolves this from WorkOS.
const currentUserId = () => DEV_CURRENT_USER_ID;

/** The actor id the app treats as the signed-in user (dev mock). */
export const CURRENT_USER_ID = DEV_CURRENT_USER_ID;

/** Application services, ready to be called by interface adapters (UI/API/CLI). */
export const services = {
  archiveFile: makeArchiveFile({ files: fileRepository, clock }),

  // Inbox (sprint 006).
  listActors: makeListActors({ actors: actorRepository }),
  listBoards: makeListBoards({ boards: boardRepository }),
  createBoard: makeCreateBoard({ boards: boardRepository }),
  archiveBoard: makeArchiveBoard({ boards: boardRepository }),
  listInbox: makeListInbox({
    boards: boardRepository,
    decisions: decisionRepository,
  }),
  getDecision: makeGetDecision({ decisions: decisionRepository }),
  createDecision: makeCreateDecision({
    boards: boardRepository,
    decisions: decisionRepository,
    actors: actorRepository,
    clock,
    currentUserId,
  }),
  answerDecision: makeAnswerDecision({
    boards: boardRepository,
    decisions: decisionRepository,
    clock,
    currentUserId,
  }),
};

export type Services = typeof services;

/**
 * Dev-only: (re)seed the inbox with the original mock content. Exposed here so a
 * dev route in the interface tier can trigger it without importing a data-tier
 * adapter directly. Not wired into any production path.
 */
export function seedDatabase() {
  return seedInbox();
}
