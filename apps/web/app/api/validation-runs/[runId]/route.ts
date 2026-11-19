import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { runId } = await params;
    return jsonOk({ run: getBlueprintRepository().getValidationRun(actor, runId) }, 200, requestId);
  });
}
