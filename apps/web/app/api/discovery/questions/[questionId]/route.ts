import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { updateClarificationQuestionSchema } from "@blueprint/validation";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { questionId } = await params;
    const input = await parseJsonBody(request, updateClarificationQuestionSchema);
    const repo = getBlueprintRepository();
    const question = repo.answerClarificationQuestion(actor, questionId, input);
    return jsonOk({ question }, 200, requestId);
  });
}
