import type { NextRequest } from "next/server";
import { ValidationError } from "@blueprint/domain";
import { getBlueprintRepository } from "@blueprint/database";
import { taskTypeParamSchema, upsertAITaskPolicySchema } from "@blueprint/validation";
import { requireActor, resolveActiveWorkspaceId } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskType: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { taskType } = await params;
    const parsedType = taskTypeParamSchema.safeParse(taskType);
    if (!parsedType.success) {
      throw new ValidationError(`Invalid AI task type "${taskType}".`);
    }
    const workspaceId = await resolveActiveWorkspaceId(
      actor,
      request.nextUrl.searchParams.get("workspaceId")
    );
    const input = await parseJsonBody(request, upsertAITaskPolicySchema);
    const policy = getBlueprintRepository().upsertAITaskPolicy(
      actor,
      workspaceId,
      parsedType.data,
      input
    );
    return jsonOk({ policy }, 200, requestId);
  });
}
