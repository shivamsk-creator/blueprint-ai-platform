import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    const repo = getBlueprintRepository();
    const { project } = repo.requireProjectAccess(actor, projectId, "project:read");
    return jsonOk(
      { logs: repo.listAuditLogs(actor, project.workspaceId, projectId) },
      200,
      requestId
    );
  });
}
