// A per-board priority. Ordered (higher `position` = more urgent) and
// customizable; exactly one is the board's default for new decisions.

export interface Priority {
  id: string;
  boardId: string;
  name: string;
  position: number;
  isDefault: boolean;
}
