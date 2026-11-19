import type { NextRequest } from "next/server";
import { z } from "zod";
import { getBlueprintRepository } from "@blueprint/database";
import {
  createAssumptionSchema,
  createConstraintSchema,
  createResearchSourceSchema,
} from "@blueprint/validation";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

const knowledgeMutationSchema = z.discriminatedUnion("kind", [
  createAssumptionSchema.extend({ kind: z.literal("assumption") }),
  createConstraintSchema.extend({ kind: z.literal("constraint") }),
  createResearchSourceSchema.extend({ kind: z.literal("research") }),
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    const repo = getBlueprintRepository();
    return jsonOk(repo.listAssumptionsAndConstraints(actor, projectId), 200, requestId);
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { projectId } = await params;
    const input = await parseJsonBody(request, knowledgeMutationSchema);
    const repo = getBlueprintRepository();
    if (input.kind === "assumption") {
      return jsonOk({ assumption: repo.createAssumption(actor, projectId, input) }, 201, requestId);
    }
    if (input.kind === "constraint") {
      return jsonOk({ constraint: repo.createConstraint(actor, projectId, input) }, 201, requestId);
    }
    return jsonOk(repo.createResearchSourceWithEvidence(actor, projectId, input), 201, requestId);
  });
}
