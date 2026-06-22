// Thin helpers shared by the inbox API route handlers: request validation
// (Zod) and a single place that maps application/domain errors to HTTP status
// codes. Keeping this here lets each route handler stay tiny: parse → call a
// service → serialize. Server-only (imports core error types); never imported
// by a client component.

import { z } from "zod";
import { TagNotAllowedError } from "@/core/application/decisions/create-decision";
import { BoardNotFoundError } from "@/core/application/decisions/archive-board";
import { DecisionNotFoundError } from "@/core/application/decisions/get-decision";
import { OptionNotForDecisionError } from "@/core/application/decisions/answer-decision";
import { AnswerContentRequiredError } from "@/core/domain/decisions/decision";

export const createDecisionSchema = z.object({
  boardId: z.string().uuid(),
  question: z.string().trim().min(1, "A question is required."),
  assigneeId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).default([]),
});

export const answerDecisionSchema = z
  .object({
    answerText: z.string().nullable().optional(),
    chosenOptionId: z.string().uuid().nullable().optional(),
  })
  .refine((v) => Boolean(v.answerText?.trim()) || Boolean(v.chosenOptionId), {
    message: "An answer requires answer text and/or a chosen option.",
  });

/** Map an error thrown by a service/domain rule to an HTTP JSON response. */
export function errorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) {
    return Response.json(
      { error: "Invalid request", issues: error.issues },
      { status: 400 },
    );
  }
  if (
    error instanceof BoardNotFoundError ||
    error instanceof DecisionNotFoundError
  ) {
    return Response.json({ error: error.message }, { status: 404 });
  }
  if (
    error instanceof TagNotAllowedError ||
    error instanceof OptionNotForDecisionError ||
    error instanceof AnswerContentRequiredError
  ) {
    return Response.json({ error: error.message }, { status: 422 });
  }
  console.error("Unhandled API error:", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
