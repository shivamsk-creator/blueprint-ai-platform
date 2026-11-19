import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { createExportSchema } from "@blueprint/validation";
import { requireActor, triggerLocalWorkerIfDemo } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    return jsonOk({ exports: getBlueprintRepository().listExports(actor, projectId) }, 200, requestId);
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    const input = await parseJsonBody(request, createExportSchema);
    const result = await getBlueprintRepository().createExportJob(actor, projectId, input);
    triggerLocalWorkerIfDemo();
    return jsonOk(result, 202, requestId);
  });
}
