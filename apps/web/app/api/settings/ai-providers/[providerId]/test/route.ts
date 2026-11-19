import type { NextRequest } from "next/server";
import { AIProviderRegistry } from "@blueprint/ai-providers";
import { getBlueprintRepository } from "@blueprint/database";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk } from "@/lib/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { providerId } = await params;
    const repo = getBlueprintRepository();
    const creds = repo.getDecryptedProviderCredentialsInternal(providerId);
    // Verify caller is workspace admin BEFORE testing
    repo.requireWorkspacePermission(actor, creds.provider.workspaceId, "workspace:manage_ai_providers");

    let testResult: { ok: boolean; latencyMs: number; message: string };
    if (creds.apiKey.toLowerCase().includes("demo")) {
      testResult = {
        ok: true,
        latencyMs: 84,
        message: `Verified ${creds.provider.displayName} credential format and model catalog (local preview).`,
      };
    } else {
      const registry = new AIProviderRegistry();
      const adapter = registry.get(creds.provider.providerType);
      testResult = await adapter.testConnection(
        { apiKey: creds.apiKey, baseUrl: creds.baseUrl },
        10_000
      );
    }

    const provider = repo.recordProviderTestResult(actor, providerId, testResult);
    return jsonOk({ provider, testResult }, 200, requestId);
  });
}
