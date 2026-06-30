// GET /api/decisions/[id] — read one decision's hydrated view model. The
// channel polls this to learn a decision's answered state + answer text. Thin:
// call the get service → serialize. 404 if not found.

import { services } from "@/infra/config/container";
import { toDecisionView } from "@/app/lib/decisions";
import { errorResponse } from "@/app/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const hydrated = await services.getDecision(id);
    return Response.json(toDecisionView(hydrated, new Date()));
  } catch (error) {
    return errorResponse(error);
  }
}
