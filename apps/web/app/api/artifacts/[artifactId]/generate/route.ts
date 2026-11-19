import type { NextRequest } from "next/server";
import { ARTIFACT_META } from "@blueprint/domain";
import { getBlueprintRepository } from "@blueprint/database";
import { enqueueArtifactGenerateSchema, JOB_SCHEMA_VERSION } from "@blueprint/validation";
import { requireActor, triggerLocalWorkerIfDemo } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { artifactId } = await params;
    const input = await parseJsonBody(request, enqueueArtifactGenerateSchema);
    const repo = getBlueprintRepository();
    const artifact = repo.getArtifact(actor, artifactId);
    const taskType = ARTIFACT_META[artifact.artifactType].taskType;

    const { job, deduplicated } = await repo.enqueueJob(actor, artifact.projectId, {
      jobType: "ai.generate_artifact",
      taskType,
      modelOverrideId: input.modelOverrideId,
      inputPayload: { artifactId, artifactType: artifact.artifactType, ...input },
      idempotencyKey: input.idempotencyKey,
      buildEnvelope: (jobId, workspaceId, idempotencyKey) => ({
        schemaVersion: JOB_SCHEMA_VERSION,
        jobId,
        workspaceId,
        projectId: artifact.projectId,
        requestedBy: actor.userId,
        idempotencyKey,
        modelOverrideId: input.modelOverrideId,
        jobType: "ai.generate_artifact",
        taskType,
        artifactId,
        artifactType: artifact.artifactType,
        instructions: input.instructions,
        requirementIds: input.requirementIds ?? [],
      }),
    });

    if (!deduplicated) await triggerLocalWorkerIfDemo();
    return jsonOk({ job: repo.getAIJob(actor, job.id), deduplicated }, deduplicated ? 200 : 202, requestId);
  });
}
