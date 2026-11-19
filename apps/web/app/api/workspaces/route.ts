import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { createWorkspaceSchema } from "@blueprint/validation";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function GET(request: NextRequest): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const repo = getBlueprintRepository();
    return jsonOk({ workspaces: repo.listWorkspaces(actor) }, 200, requestId);
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const input = await parseJsonBody(request, createWorkspaceSchema);
    const repo = getBlueprintRepository();
    const workspace = repo.createWorkspace(actor, input);
    return jsonOk({ workspace }, 201, requestId);
  });
}
