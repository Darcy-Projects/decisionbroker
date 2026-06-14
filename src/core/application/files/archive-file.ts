import { archive, type FileRecord } from "@/core/domain/files/file";
import type { FileRepository } from "@/core/ports/file-repository";
import type { Clock } from "@/core/ports/clock";

/** Raised when the requested file does not exist. */
export class FileNotFoundError extends Error {
  constructor(public readonly fileId: string) {
    super(`File not found: ${fileId}`);
    this.name = "FileNotFoundError";
  }
}

export interface ArchiveFileDeps {
  files: FileRepository;
  clock: Clock;
}

/**
 * Application service (use case): archive a file by id. Orchestrates the domain
 * rule + the repository port; contains no transport (HTTP) or persistence (SQL)
 * detail. Built once with its dependencies by the composition root.
 */
export function makeArchiveFile(deps: ArchiveFileDeps) {
  return async function archiveFile(fileId: string): Promise<FileRecord> {
    const file = await deps.files.findById(fileId);
    if (!file) throw new FileNotFoundError(fileId);

    const archived = archive(file, deps.clock.now());
    await deps.files.save(archived);
    return archived;
  };
}

export type ArchiveFile = ReturnType<typeof makeArchiveFile>;
