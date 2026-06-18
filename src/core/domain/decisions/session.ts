// The originating agent run a decision came from (optional). A session is run
// by an actor of kind `agent`.

export interface Session {
  id: string;
  name: string;
  project: string | null;
  agentId: string;
  createdAt: Date;
  updatedAt: Date;
}
