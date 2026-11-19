import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { stageKeyParamSchema, updateStageSchema } from "@blueprint/validation";
import { ValidationError } from "@blueprint/domain";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; stageKey: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId, stageKey } = await params;
    const parsedStage = stageKeyParamSchema.safeParse(stageKey);
    if (!parsedStage.success) {
      throw new ValidationError(`Invalid stage key "${stageKey}".`);
    }
    const input = await parseJsonBody(request, updateStageSchema);
    const repo = getBlueprintRepository();
    const stage = repo.updateProjectStage(actor, projectId, parsedStage.data, input);
    return jsonOk({ stage }, 200, requestId);
  });
}
