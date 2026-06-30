// POST /api/boards — create a board (the Add-board dialog). Thin: validate with
// Zod → pick a palette color → call the create service → serialize the new board
// view model. The service seeds the board's default steps + priorities.

import { services, CURRENT_USER_ID } from "@/infra/config/container";
import { toBoardView } from "@/app/lib/decisions";
import { createBoardSchema, errorResponse } from "@/app/lib/api";

// Tailwind color tokens new boards cycle through (matches the seed palette).
const BOARD_COLORS = [
  "bg-primary",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-destructive",
];

export async function POST(request: Request) {
  try {
    const input = createBoardSchema.parse(await request.json());
    // Assign the next palette color by board count so a fresh board visually
    // differs from its neighbors.
    const existing = await services.listBoards({ includeArchived: true });
    const color = BOARD_COLORS[existing.length % BOARD_COLORS.length];
    const config = await services.createBoard({
      name: input.name,
      ownerId: CURRENT_USER_ID,
      color,
    });
    return Response.json(toBoardView(config.board), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
