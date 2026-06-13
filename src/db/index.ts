import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Reuse a single client across hot reloads (dev) and warm serverless
// invocations (prod) so we don't exhaust connections.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
};

// `prepare: false` keeps us compatible with transaction-mode poolers
// (e.g. Neon's pooled endpoint / PgBouncer). Harmless for local Postgres.
const client =
  globalForDb.client ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
