import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { createProjectSchema } from "@blueprint/validation";
import { requireActor, resolveActiveWorkspaceId } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function GET(request: NextRequest): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const repo = getBlueprintRepository();
    const wsParam = request.nextUrl.searchParams.get("workspaceId");
    const workspaceId = wsParam || (await resolveActiveWorkspaceId(actor));
    return jsonOk({ projects: repo.listProjects(actor, workspaceId) }, 200, requestId);
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const input = await parseJsonBody(request, createProjectSchema);
    const workspaceId = await resolveActiveWorkspaceId(actor, input.workspaceId);
    const repo = getBlueprintRepository();
    const project = repo.createProject(actor, { ...input, workspaceId });
    return jsonOk({ project }, 201, requestId);
  });
}
