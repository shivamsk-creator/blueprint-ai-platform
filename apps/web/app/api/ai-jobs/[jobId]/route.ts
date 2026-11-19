import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { jobId } = await params;
    return jsonOk({ job: getBlueprintRepository().getAIJob(actor, jobId) }, 200, requestId);
  });
}
