import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { createTestCaseSchema } from "@blueprint/validation";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    return jsonOk({ testCases: getBlueprintRepository().listTestCases(actor, projectId) }, 200, requestId);
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    const input = await parseJsonBody(request, createTestCaseSchema);
    const testCase = getBlueprintRepository().createTestCase(actor, projectId, input);
    return jsonOk({ testCase }, 201, requestId);
  });
}
