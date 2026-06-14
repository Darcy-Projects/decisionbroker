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
import { DrizzleFileRepository } from "@/infra/db/drizzle/file-repository";
import { SystemClock } from "@/infra/clock/system-clock";

const fileRepository = new DrizzleFileRepository();
const clock = new SystemClock();

/** Application services, ready to be called by interface adapters (UI/API/CLI). */
export const services = {
  archiveFile: makeArchiveFile({ files: fileRepository, clock }),
};

export type Services = typeof services;
