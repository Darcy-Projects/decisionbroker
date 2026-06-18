// Domain model for an actor — a person or an automated agent. Both are
// first-class: either can raise a decision, be assigned, author messages, and
// act on a decision's timeline. The core's OWN representation, independent of
// the database schema; adapters map their rows to and from this type.

export type ActorKind = "user" | "agent";

export interface Actor {
  id: string;
  kind: ActorKind;
  displayName: string;
  /** Human role label ("Head of Legal"); null for agents. */
  role: string | null;
  /** Set for humans once WorkOS lands; null for agents and pre-auth mocks. */
  workosUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
