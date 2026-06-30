import type { Session } from "@/core/domain/decisions/session";

/** Everything needed to create a session row. */
export interface CreateSessionData {
  name: string;
  project: string | null;
  /** The agent (an actor of kind `agent`) that ran this session. */
  agentId: string;
}

/**
 * Driven port: sessions — one row per agent launch (e.g. a Claude Code run).
 * Decisions raised during the launch link back to the session so the inbox can
 * group and attribute them. Rows never leak inward — the adapter maps to/from
 * the domain `Session` type.
 */
export interface SessionRepository {
  /** Insert a session row and return it hydrated as a domain `Session`. */
  create(data: CreateSessionData): Promise<Session>;
  /** One session, or null if it does not exist. */
  findById(id: string): Promise<Session | null>;
}
