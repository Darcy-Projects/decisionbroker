// A multiple-choice option a decision offers. A decision's `chosenOptionId`,
// when set, must reference one of its own options (invariant enforced in the
// application layer).

export interface DecisionOption {
  id: string;
  decisionId: string;
  label: string;
  detail: string | null;
  recommended: boolean;
  position: number;
}
