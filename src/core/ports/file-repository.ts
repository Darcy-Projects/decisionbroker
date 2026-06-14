import type { FileRecord } from "@/core/domain/files/file";

/**
 * Driven port: what the core needs from "wherever files are stored as rows".
 * Implemented by adapters in the data tier (e.g. Drizzle/Postgres). The core
 * depends only on this interface, never on a concrete database.
 */
export interface FileRepository {
  findById(id: string): Promise<FileRecord | null>;
  /** Persist the current state of an existing file aggregate. */
  save(file: FileRecord): Promise<void>;
}
