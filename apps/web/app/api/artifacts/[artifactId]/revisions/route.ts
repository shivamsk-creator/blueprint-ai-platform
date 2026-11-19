import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { createArtifactRevisionSchema } from "@blueprint/validation";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { artifactId } = await params;
    const repo = getBlueprintRepository();
    return jsonOk({ revisions: repo.listArtifactRevisions(actor, artifactId) }, 200, requestId);
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { artifactId } = await params;
    const input = await parseJsonBody(request, createArtifactRevisionSchema);
    const repo = getBlueprintRepository();
    const revision = repo.createArtifactRevision(actor, artifactId, {
      ...input,
      source: "manual",
      setAsCurrent: true,
    });
    return jsonOk({ revision }, 201, requestId);
  });
}
