// POST /api/decisions/[id]/answer — answer a decision. Thin: validate with Zod
// → call the answer service → serialize the updated decision view model.

import { services } from "@/infra/config/container";
import { toDecisionView } from "@/app/lib/decisions";
import { answerDecisionSchema, errorResponse } from "@/app/lib/api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const input = answerDecisionSchema.parse(await request.json());
    const hydrated = await services.answerDecision({
      decisionId: id,
      answerText: input.answerText ?? null,
      chosenOptionId: input.chosenOptionId ?? null,
    });
    return Response.json(toDecisionView(hydrated, new Date()));
  } catch (error) {
    return errorResponse(error);
  }
}
