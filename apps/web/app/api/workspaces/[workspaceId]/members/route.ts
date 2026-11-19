import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { workspaceId } = await params;
    const repo = getBlueprintRepository();
    return jsonOk(repo.listWorkspaceMembers(actor, workspaceId), 200, requestId);
  });
}
