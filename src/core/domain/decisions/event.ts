// An entry in a decision's timeline / audit log. Some events are system events
// with no actor (e.g. "Answer returned to session").

export interface DecisionEvent {
  id: string;
  decisionId: string;
  actorId: string | null;
  label: string;
  createdAt: Date;
}
