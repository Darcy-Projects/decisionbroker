// Domain model for a stored file. This is the core's OWN representation — it is
// deliberately independent of the database schema (Drizzle) and any host (R2/S3).
// Adapters map their persistence/transport shapes to and from these types.

export type FileStatus = "active" | "archived";
export type StorageClass = "standard" | "infrequent";

export interface FileRecord {
  id: string;
  ownerUserId: string;
  objectKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  status: FileStatus;
  storageClass: StorageClass;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Business rule: archiving a file moves it to the "archived" workflow state and
 * down to "infrequent" storage (cheaper, pay-per-retrieval). Pure and
 * idempotent — no I/O, time is injected so it stays deterministic/testable.
 */
export function archive(file: FileRecord, now: Date): FileRecord {
  if (file.status === "archived") return file;
  return {
    ...file,
    status: "archived",
    storageClass: "infrequent",
    archivedAt: now,
    updatedAt: now,
  };
}
