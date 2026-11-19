import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { updateRequirementSchema } from "@blueprint/validation";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requirementId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { requirementId } = await params;
    const repo = getBlueprintRepository();
    return jsonOk({ requirement: repo.getRequirement(actor, requirementId) }, 200, requestId);
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requirementId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { requirementId } = await params;
    const input = await parseJsonBody(request, updateRequirementSchema);
    const repo = getBlueprintRepository();
    const result = repo.updateRequirement(actor, requirementId, input);
    return jsonOk(result, 200, requestId);
  });
}
