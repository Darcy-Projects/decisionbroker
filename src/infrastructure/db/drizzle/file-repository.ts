import { eq } from "drizzle-orm";
import type { FileRecord } from "@/core/domain/files/file";
import type { FileRepository } from "@/core/ports/file-repository";
import { getDb } from "@/infra/db/drizzle/client";
import { files, type FileRecord as FileRow } from "@/infra/db/drizzle/schema";

// Map the Drizzle row shape to the core's domain type. The field names line up
// today, but the mapping is explicit so the schema can drift from the domain
// without leaking storage concerns into the core.
function toDomain(row: FileRow): FileRecord {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    objectKey: row.objectKey,
    fileName: row.fileName,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    status: row.status,
    storageClass: row.storageClass,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Drizzle/Postgres adapter implementing the FileRepository port. */
export class DrizzleFileRepository implements FileRepository {
  async findById(id: string): Promise<FileRecord | null> {
    const [row] = await getDb()
      .select()
      .from(files)
      .where(eq(files.id, id))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async save(file: FileRecord): Promise<void> {
    await getDb()
      .update(files)
      .set({
        status: file.status,
        storageClass: file.storageClass,
        archivedAt: file.archivedAt,
        updatedAt: file.updatedAt,
      })
      .where(eq(files.id, file.id));
  }
}
