import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { createDevelopmentTaskSchema } from "@blueprint/validation";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    return jsonOk({ tasks: getBlueprintRepository().listDevelopmentTasks(actor, projectId) }, 200, requestId);
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    const input = await parseJsonBody(request, createDevelopmentTaskSchema);
    const task = getBlueprintRepository().createDevelopmentTask(actor, projectId, input);
    return jsonOk({ task }, 201, requestId);
  });
}
