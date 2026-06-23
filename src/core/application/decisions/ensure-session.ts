import type { ActorRepository } from "@/core/ports/actor-repository";
import type { SessionRepository } from "@/core/ports/session-repository";

/**
 * Display name of the singleton agent that owns Claude Code launches. Every
 * session created from the channel is attributed to this one agent actor, so
 * decisions it raises read e.g. "Question raised by Claude Code".
 */
export const CLAUDE_CODE_AGENT_NAME = "Claude Code";

/** Raised when a referenced session does not exist. */
export class SessionNotFoundError extends Error {
  constructor(public readonly sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = "SessionNotFoundError";
  }
}

export interface EnsureSessionInput {
  /** Human label for the launch, e.g. "Claude Code · <cwd>". */
  name: string;
  /** Optional project/context label. */
  project?: string | null;
}

export interface EnsureSessionResult {
  sessionId: string;
  agentId: string;
}

export interface EnsureSessionDeps {
  actors: ActorRepository;
  sessions: SessionRepository;
}

/**
 * Application service: ensure the agent actor + a session row for one launch.
 * Find-or-creates the singleton Claude Code agent, then creates a fresh session
 * referencing it. The caller (the channel) holds the returned `sessionId` for
 * the rest of the launch and passes it on every decision it raises.
 */
export function makeEnsureSession(deps: EnsureSessionDeps) {
  return async function ensureSession(
    input: EnsureSessionInput,
  ): Promise<EnsureSessionResult> {
    const agent = await deps.actors.findOrCreateAgent(CLAUDE_CODE_AGENT_NAME);
    const session = await deps.sessions.create({
      name: input.name.trim(),
      project: input.project?.trim() || null,
      agentId: agent.id,
    });
    return { sessionId: session.id, agentId: agent.id };
  };
}

export type EnsureSession = ReturnType<typeof makeEnsureSession>;
