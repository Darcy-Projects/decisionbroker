// A workflow stage of a board. Boards seed two endpoints (an initial and a
// terminal step); custom stages sit between them, ordered by `position`.

export interface Step {
  id: string;
  boardId: string;
  name: string;
  position: number;
  isInitial: boolean;
  isTerminal: boolean;
}
