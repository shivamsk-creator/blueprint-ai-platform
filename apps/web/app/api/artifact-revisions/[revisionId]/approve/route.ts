import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { approveRevisionSchema } from "@blueprint/validation";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ revisionId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { revisionId } = await params;
    const input = await parseJsonBody(request, approveRevisionSchema);
    const repo = getBlueprintRepository();
    const result = repo.approveArtifactRevision(actor, revisionId, input);
    return jsonOk(result, 200, requestId);
  });
}
