import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { createRequirementSchema } from "@blueprint/validation";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    const sp = request.nextUrl.searchParams;
    const repo = getBlueprintRepository();
    const requirements = repo.listRequirements(actor, projectId, {
      status: sp.get("status") ?? undefined,
      type: sp.get("type") ?? undefined,
      search: sp.get("search") ?? undefined,
    });
    return jsonOk({ requirements }, 200, requestId);
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    const input = await parseJsonBody(request, createRequirementSchema);
    const repo = getBlueprintRepository();
    const requirement = repo.createRequirement(actor, projectId, input);
    return jsonOk({ requirement }, 201, requestId);
  });
}
