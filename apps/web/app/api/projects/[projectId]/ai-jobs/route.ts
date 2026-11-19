import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { createAIJobSchema, JOB_SCHEMA_VERSION, type JobEnvelope } from "@blueprint/validation";
import { requireActor, triggerLocalWorkerIfDemo } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    return jsonOk({ jobs: getBlueprintRepository().listAIJobs(actor, projectId) }, 200, requestId);
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    const input = await parseJsonBody(request, createAIJobSchema);
    const repo = getBlueprintRepository();
    const { job, deduplicated } = await repo.enqueueJob(actor, projectId, {
      jobType: input.jobType,
      taskType: input.taskType,
      modelOverrideId: input.modelOverrideId,
      inputPayload: input.inputPayload,
      idempotencyKey: input.idempotencyKey,
      buildEnvelope: (jobId, workspaceId, idempotencyKey) =>
        ({
          schemaVersion: JOB_SCHEMA_VERSION,
          jobId,
          workspaceId,
          projectId,
          requestedBy: actor.userId,
          idempotencyKey,
          modelOverrideId: input.modelOverrideId,
          jobType: input.jobType,
          taskType: input.taskType,
          ...input.inputPayload,
        }) as unknown as JobEnvelope,
    });
    if (!deduplicated) triggerLocalWorkerIfDemo();
    return jsonOk({ job, deduplicated }, deduplicated ? 200 : 202, requestId);
  });
}
