import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { updateProjectSchema } from "@blueprint/validation";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    const repo = getBlueprintRepository();
    return jsonOk({ project: repo.getProject(actor, projectId) }, 200, requestId);
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    const input = await parseJsonBody(request, updateProjectSchema);
    const repo = getBlueprintRepository();
    return jsonOk({ project: repo.updateProject(actor, projectId, input) }, 200, requestId);
  });
}
