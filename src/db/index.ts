import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Cache the client/db on globalThis so warm serverless invocations and dev
// hot-reloads reuse one connection instead of exhausting the pool.
const globalForDb = globalThis as unknown as {
  dbClient?: ReturnType<typeof postgres>;
  db?: PostgresJsDatabase<typeof schema>;
};

function init(): PostgresJsDatabase<typeof schema> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // `prepare: false` keeps us compatible with transaction-mode poolers
  // (e.g. Neon's pooled endpoint / PgBouncer). Harmless for local Postgres.
  const client =
    globalForDb.dbClient ?? postgres(connectionString, { prepare: false });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.dbClient = client;
  }

  return drizzle(client, { schema });
}

/**
 * Lazily-created Drizzle client. Lazy so importing this module never requires
 * DATABASE_URL (e.g. during `next build`) — it's only needed when a query runs.
 */
export function getDb(): PostgresJsDatabase<typeof schema> {
  return (globalForDb.db ??= init());
}
