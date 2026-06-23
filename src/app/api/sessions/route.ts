// POST /api/sessions — ensure the agent actor + a session row for one launch.
// The channel calls this once per process and holds the returned sessionId.
// Thin: validate with Zod → call the ensure service → serialize the ids.

import { services } from "@/infra/config/container";
import { createSessionSchema, errorResponse } from "@/app/lib/api";

export async function POST(request: Request) {
  try {
    const input = createSessionSchema.parse(await request.json());
    const result = await services.ensureSession({
      name: input.name,
      project: input.project ?? null,
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
