import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { createTraceabilityLinkSchema } from "@blueprint/validation";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    return jsonOk({ matrix: getBlueprintRepository().getTraceabilityMatrix(actor, projectId) }, 200, requestId);
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    const input = await parseJsonBody(request, createTraceabilityLinkSchema);
    const link = getBlueprintRepository().createTraceabilityLink(actor, projectId, input);
    return jsonOk({ link }, 201, requestId);
  });
}
