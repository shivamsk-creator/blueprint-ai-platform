import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { enqueueDiscoveryAnalyzeSchema, JOB_SCHEMA_VERSION } from "@blueprint/validation";
import { requireActor, triggerLocalWorkerIfDemo } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    const input = await parseJsonBody(request, enqueueDiscoveryAnalyzeSchema);
    const repo = getBlueprintRepository();
    const { job, deduplicated } = await repo.enqueueJob(actor, projectId, {
      jobType: "discovery.analyze",
      taskType: "requirement_analysis",
      modelOverrideId: input.modelOverrideId,
      inputPayload: input,
      idempotencyKey: input.idempotencyKey,
      buildEnvelope: (jobId, workspaceId, idempotencyKey) => ({
        schemaVersion: JOB_SCHEMA_VERSION,
        jobId,
        workspaceId,
        projectId,
        requestedBy: actor.userId,
        idempotencyKey,
        modelOverrideId: input.modelOverrideId,
        jobType: "discovery.analyze",
        taskType: "requirement_analysis",
        sessionId: input.sessionId,
        fileIds: input.fileIds,
        instructions: input.instructions,
      }),
    });
    if (!deduplicated) await triggerLocalWorkerIfDemo();
    return jsonOk({ job: repo.getAIJob(actor, job.id), deduplicated }, deduplicated ? 200 : 202, requestId);
  });
}
