import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { createAIProviderSchema } from "@blueprint/validation";
import { requireActor, resolveActiveWorkspaceId } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function GET(request: NextRequest): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const workspaceId = await resolveActiveWorkspaceId(
      actor,
      request.nextUrl.searchParams.get("workspaceId")
    );
    const providers = getBlueprintRepository().listAIProviders(actor, workspaceId);
    return jsonOk({ providers }, 200, requestId);
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const workspaceId = await resolveActiveWorkspaceId(
      actor,
      request.nextUrl.searchParams.get("workspaceId")
    );
    const input = await parseJsonBody(request, createAIProviderSchema);
    const result = getBlueprintRepository().createAIProvider(actor, workspaceId, input);
    return jsonOk(result, 201, requestId);
  });
}
