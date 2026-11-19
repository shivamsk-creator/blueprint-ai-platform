import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk } from "@/lib/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { jobId } = await params;
    const job = getBlueprintRepository().cancelAIJob(actor, jobId);
    return jsonOk({ job }, 200, requestId);
  });
}
