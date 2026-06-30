// POST /api/decisions — create a decision from the Add dialog. Thin: validate
// with Zod → call the create service → serialize the new decision view model.

import { services } from "@/infra/config/container";
import { toDecisionView } from "@/app/lib/decisions";
import { createDecisionSchema, errorResponse } from "@/app/lib/api";

export async function POST(request: Request) {
  try {
    const input = createDecisionSchema.parse(await request.json());
    const hydrated = await services.createDecision({
      boardId: input.boardId,
      question: input.question,
      assigneeId: input.assigneeId ?? null,
      tags: input.tags,
      sessionId: input.sessionId ?? null,
    });
    return Response.json(toDecisionView(hydrated, new Date()), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
