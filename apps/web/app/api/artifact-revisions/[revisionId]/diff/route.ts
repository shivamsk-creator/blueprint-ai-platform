import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ revisionId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { revisionId } = await params;
    const compareTo = request.nextUrl.searchParams.get("compareTo");
    const repo = getBlueprintRepository();
    const diff = repo.diffArtifactRevision(actor, revisionId, compareTo);
    return jsonOk({ diff }, 200, requestId);
  });
}
