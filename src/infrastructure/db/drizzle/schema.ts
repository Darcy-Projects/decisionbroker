import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// files (sprint 001/004) — kept as-is.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// inbox model (sprint 006 — postgres for inbox).
// See docs/live/data-model.md for the entities, relationships, and invariants.
// ---------------------------------------------------------------------------

// A participant in the system. Humans (`user`) and automated agents (`agent`)
// are both first-class actors: either can raise, be assigned, author messages,
// and act on a decision's timeline.
export const actorKind = pgEnum("actor_kind", ["user", "agent"]);

// The category of decision being asked. Drives nothing structural yet; mirrors
// the old frontend `DecisionKind` union.
export const decisionKind = pgEnum("decision_kind", [
  "approval",
  "choice",
  "judgment",
  "clarification",
  "escalation",
]);

export const actors = pgTable(
  "actors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: actorKind("kind").notNull(),
    displayName: text("display_name").notNull(),
    // Human role label ("Head of Legal"); null for agents.
    role: text("role"),
    // Set for humans once WorkOS lands; null for agents and pre-auth mocks.
    workosUserId: text("workos_user_id").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("actors_kind_idx").on(table.kind)],
);

export const boards = pgTable(
  "boards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => actors.id),
    // Tailwind color token, e.g. `bg-primary`.
    color: text("color").notNull(),
    refPrefix: text("ref_prefix").notNull().default("DEC-"),
    // Last issued ref number (per board). Incremented when a decision is created.
    refSeq: integer("ref_seq").notNull().default(0),
    // Soft archive — only boards archive. Hides the board + its decisions.
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("boards_archived_idx").on(table.archived)],
);

export const boardSteps = pgTable(
  "board_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    isInitial: boolean("is_initial").notNull().default(false),
    isTerminal: boolean("is_terminal").notNull().default(false),
  },
  (table) => [
    uniqueIndex("board_steps_board_name_uq").on(table.boardId, table.name),
    // Exactly one initial and one terminal step per board.
    uniqueIndex("board_steps_one_initial_uq")
      .on(table.boardId)
      .where(sql`${table.isInitial}`),
    uniqueIndex("board_steps_one_terminal_uq")
      .on(table.boardId)
      .where(sql`${table.isTerminal}`),
  ],
);

export const boardPriorities = pgTable(
  "board_priorities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Sort order (higher = more urgent).
    position: integer("position").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (table) => [
    uniqueIndex("board_priorities_board_name_uq").on(table.boardId, table.name),
    // Exactly one default priority per board.
    uniqueIndex("board_priorities_one_default_uq")
      .on(table.boardId)
      .where(sql`${table.isDefault}`),
  ],
);

export const boardTags = pgTable(
  "board_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    // Normalized lowercase, no leading `#`.
    name: text("name").notNull(),
  },
  (table) => [
    uniqueIndex("board_tags_board_name_uq").on(table.boardId, table.name),
  ],
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  project: text("project"),
  // The agent (an actor of kind `agent`) that ran this session.
  agentId: uuid("agent_id")
    .notNull()
    .references(() => actors.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const decisions = pgTable(
  "decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id),
    // Per-board sequence number; display ref = board.refPrefix || refNumber.
    refNumber: integer("ref_number").notNull(),
    // Short label; UI falls back to a truncated question when null.
    title: text("title"),
    question: text("question").notNull(),
    context: text("context"),
    kind: decisionKind("kind").notNull(),
    stepId: uuid("step_id")
      .notNull()
      .references(() => boardSteps.id),
    priorityId: uuid("priority_id")
      .notNull()
      .references(() => boardPriorities.id),
    questionerId: uuid("questioner_id")
      .notNull()
      .references(() => actors.id),
    assigneeId: uuid("assignee_id").references(() => actors.id),
    questionAt: timestamp("question_at", { withTimezone: true }).notNull(),
    sessionId: uuid("session_id").references(() => sessions.id),
    // True = resolved by a rule (still lands on the terminal step).
    autoResolved: boolean("auto_resolved").notNull().default(false),
    answerText: text("answer_text"),
    // Circular reference with decision_options; FK created after both tables.
    // `AnyPgColumn` breaks the otherwise-circular type inference.
    chosenOptionId: uuid("chosen_option_id").references(
      (): AnyPgColumn => decisionOptions.id,
      { onDelete: "set null" },
    ),
    answeredById: uuid("answered_by_id").references(() => actors.id),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("decisions_board_ref_uq").on(table.boardId, table.refNumber),
    // Hot path: list a board's inbox, optionally filtered by step.
    index("decisions_board_step_idx").on(table.boardId, table.stepId),
  ],
);

export const decisionOptions = pgTable("decision_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  decisionId: uuid("decision_id")
    .notNull()
    .references(() => decisions.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  detail: text("detail"),
  recommended: boolean("recommended").notNull().default(false),
  position: integer("position").notNull(),
});

export const decisionMessages = pgTable(
  "decision_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => actors.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("decision_messages_decision_idx").on(
      table.decisionId,
      table.createdAt,
    ),
  ],
);

export const decisionEvents = pgTable(
  "decision_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    // Some events have no actor (system events).
    actorId: uuid("actor_id").references(() => actors.id),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("decision_events_decision_idx").on(table.decisionId, table.createdAt),
  ],
);

export const decisionTags = pgTable(
  "decision_tags",
  {
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => boardTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.decisionId, table.tagId] }),
  ],
);

export type ActorRow = typeof actors.$inferSelect;
export type NewActorRow = typeof actors.$inferInsert;
export type BoardRow = typeof boards.$inferSelect;
export type NewBoardRow = typeof boards.$inferInsert;
export type BoardStepRow = typeof boardSteps.$inferSelect;
export type NewBoardStepRow = typeof boardSteps.$inferInsert;
export type BoardPriorityRow = typeof boardPriorities.$inferSelect;
export type NewBoardPriorityRow = typeof boardPriorities.$inferInsert;
export type BoardTagRow = typeof boardTags.$inferSelect;
export type NewBoardTagRow = typeof boardTags.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type DecisionRow = typeof decisions.$inferSelect;
export type NewDecisionRow = typeof decisions.$inferInsert;
export type DecisionOptionRow = typeof decisionOptions.$inferSelect;
export type NewDecisionOptionRow = typeof decisionOptions.$inferInsert;
export type DecisionMessageRow = typeof decisionMessages.$inferSelect;
export type NewDecisionMessageRow = typeof decisionMessages.$inferInsert;
export type DecisionEventRow = typeof decisionEvents.$inferSelect;
export type NewDecisionEventRow = typeof decisionEvents.$inferInsert;
export type DecisionTagRow = typeof decisionTags.$inferSelect;
export type NewDecisionTagRow = typeof decisionTags.$inferInsert;
