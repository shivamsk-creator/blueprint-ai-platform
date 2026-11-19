import type { NextRequest } from "next/server";
import { ARTIFACT_META } from "@blueprint/domain";
import { getBlueprintRepository } from "@blueprint/database";
import { enqueueSectionRegenerateSchema, JOB_SCHEMA_VERSION } from "@blueprint/validation";
import { requireActor, triggerLocalWorkerIfDemo } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { artifactId } = await params;
    const input = await parseJsonBody(request, enqueueSectionRegenerateSchema);
    const repo = getBlueprintRepository();
    const artifact = repo.getArtifact(actor, artifactId);
    const taskType = ARTIFACT_META[artifact.artifactType].taskType;

    const { job, deduplicated } = await repo.enqueueJob(actor, artifact.projectId, {
      jobType: "ai.regenerate_section",
      taskType,
      modelOverrideId: input.modelOverrideId,
      inputPayload: { artifactId, ...input },
      idempotencyKey: input.idempotencyKey,
      buildEnvelope: (jobId, workspaceId, idempotencyKey) => ({
        schemaVersion: JOB_SCHEMA_VERSION,
        jobId,
        workspaceId,
        projectId: artifact.projectId,
        requestedBy: actor.userId,
        idempotencyKey,
        modelOverrideId: input.modelOverrideId,
        jobType: "ai.regenerate_section",
        taskType,
        artifactId,
        artifactType: artifact.artifactType,
        baseRevisionId: input.baseRevisionId,
        sectionKey: input.sectionKey,
        instructions: input.instructions,
      }),
    });

    if (!deduplicated) triggerLocalWorkerIfDemo();
    return jsonOk({ job, deduplicated }, deduplicated ? 200 : 202, requestId);
  });
}
