import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { requireActor, resolveActiveWorkspaceId } from "@/lib/auth";
import { handleApiRoute, jsonOk } from "@/lib/http";

export async function GET(request: NextRequest): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const workspaceId = await resolveActiveWorkspaceId(
      actor,
      request.nextUrl.searchParams.get("workspaceId")
    );
    const repo = getBlueprintRepository();
    repo.requireWorkspacePermission(actor, workspaceId, "workspace:view_audit");
    return jsonOk({ logs: repo.listAuditLogs(actor, workspaceId) }, 200, requestId);
  });
}
