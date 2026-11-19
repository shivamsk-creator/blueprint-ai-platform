import type { NextRequest } from "next/server";
import { z } from "zod";
import { getBlueprintRepository } from "@blueprint/database";
import { JOB_SCHEMA_VERSION } from "@blueprint/validation";
import { requireActor, triggerLocalWorkerIfDemo } from "@/lib/auth";
import { handleApiRoute, jsonOk } from "@/lib/http";

const triggerValidationSchema = z.object({
  includeAiReview: z.boolean().default(true),
  modelOverrideId: z.string().optional(),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    return jsonOk({ runs: getBlueprintRepository().listValidationRuns(actor, projectId) }, 200, requestId);
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    let parsedInput: z.output<typeof triggerValidationSchema> = { includeAiReview: true };
    try {
      const raw = await request.json();
      parsedInput = triggerValidationSchema.parse(raw);
    } catch {
      // Allow empty POST body with defaults
    }

    const repo = getBlueprintRepository();
    const run = repo.runValidationNow(actor, projectId);
    const { job } = await repo.enqueueJob(actor, projectId, {
      jobType: "validation.run",
      taskType: "consistency_validation",
      modelOverrideId: parsedInput.modelOverrideId,
      inputPayload: { validationRunId: run.id, includeAiReview: parsedInput.includeAiReview },
      idempotencyKey: parsedInput.idempotencyKey,
      buildEnvelope: (jobId, workspaceId, idempotencyKey) => ({
        schemaVersion: JOB_SCHEMA_VERSION,
        jobId,
        workspaceId,
        projectId,
        requestedBy: actor.userId,
        idempotencyKey,
        modelOverrideId: parsedInput.modelOverrideId,
        jobType: "validation.run",
        taskType: "consistency_validation",
        validationRunId: run.id,
        includeAiReview: parsedInput.includeAiReview,
      }),
    });
    await triggerLocalWorkerIfDemo();
    return jsonOk({ run, job }, 202, requestId);
  });
}
