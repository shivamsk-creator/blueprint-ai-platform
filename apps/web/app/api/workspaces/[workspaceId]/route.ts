import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { updateWorkspaceSchema } from "@blueprint/validation";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { workspaceId } = await params;
    const repo = getBlueprintRepository();
    return jsonOk({ workspace: repo.getWorkspace(actor, workspaceId) }, 200, requestId);
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { workspaceId } = await params;
    const input = await parseJsonBody(request, updateWorkspaceSchema);
    const repo = getBlueprintRepository();
    return jsonOk({ workspace: repo.updateWorkspace(actor, workspaceId, input) }, 200, requestId);
  });
}
