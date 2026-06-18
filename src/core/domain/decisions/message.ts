// A message in a decision's conversation thread. The author's kind (user/agent)
// is derived from the author actor, so there is no separate author-type field.

export interface DecisionMessage {
  id: string;
  decisionId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}
