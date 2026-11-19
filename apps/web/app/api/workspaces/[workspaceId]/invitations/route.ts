import type { NextRequest } from "next/server";
import { getBlueprintRepository } from "@blueprint/database";
import { inviteMemberSchema } from "@blueprint/validation";
import { requireActor } from "@/lib/auth";
import { handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { workspaceId } = await params;
    const input = await parseJsonBody(request, inviteMemberSchema);
    const repo = getBlueprintRepository();
    const invitation = repo.inviteWorkspaceMember(actor, workspaceId, input);
    return jsonOk({ invitation }, 201, requestId);
  });
}
