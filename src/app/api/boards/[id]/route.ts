// PATCH /api/boards/[id] — rename a board (the Edit-board popup). Thin: validate
// with Zod → call the update service → serialize the board view model. 404 if
// the board does not exist.

import { services } from "@/infra/config/container";
import { toBoardView } from "@/app/lib/decisions";
import { updateBoardSchema, errorResponse } from "@/app/lib/api";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const input = updateBoardSchema.parse(await request.json());
    const board = await services.updateBoard({ boardId: id, name: input.name });
    return Response.json(toBoardView(board));
  } catch (error) {
    return errorResponse(error);
  }
}
