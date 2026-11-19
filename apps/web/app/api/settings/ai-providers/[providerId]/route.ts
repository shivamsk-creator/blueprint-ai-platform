import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { updateAIProviderSchema } from "@blueprint/validation";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { providerId } = await params;
    const input = await parseJsonBody(request, updateAIProviderSchema);
    const provider = getBlueprintRepository().updateAIProvider(actor, providerId, input);
    return jsonOk({ provider }, 200, requestId);
  });
}
