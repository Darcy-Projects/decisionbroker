import {
  bigint,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Workflow state. Files move through a workflow and end up "archived".
// Add intermediate states here as the workflow is defined.
export const fileStatus = pgEnum("file_status", ["active", "archived"]);

// R2/S3 storage class. Active files stay "standard"; archived files move to
// "infrequent" access (cheaper storage, slower / pay-per-retrieval access).
export const storageClass = pgEnum("storage_class", ["standard", "infrequent"]);

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // WorkOS user id of the owner. Per-user access is enforced in the app layer:
    // we check this against the authenticated user before serving a file.
    ownerUserId: text("owner_user_id").notNull(),
    // Key of the object in the R2 bucket (the bucket itself is private).
    objectKey: text("object_key").notNull().unique(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    status: fileStatus("status").notNull().default("active"),
    storageClass: storageClass("storage_class").notNull().default("standard"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("files_owner_idx").on(table.ownerUserId),
    // Fast "active files for this user" lookups (most files will be archived).
    index("files_owner_status_idx").on(table.ownerUserId, table.status),
  ],
);

export type FileRecord = typeof files.$inferSelect;
export type NewFileRecord = typeof files.$inferInsert;
