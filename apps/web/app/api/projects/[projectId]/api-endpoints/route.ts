import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { createApiEndpointSchema } from "@blueprint/validation";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    return jsonOk(getBlueprintRepository().getApiBundle(actor, projectId), 200, requestId);
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    const input = await parseJsonBody(request, createApiEndpointSchema);
    const endpoint = getBlueprintRepository().createApiEndpoint(actor, projectId, input);
    return jsonOk({ endpoint }, 201, requestId);
  });
}
