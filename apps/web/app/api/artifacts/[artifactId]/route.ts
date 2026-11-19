import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { artifactId } = await params;
    const repo = getBlueprintRepository();
    return jsonOk({ artifact: repo.getArtifact(actor, artifactId) }, 200, requestId);
  });
}
