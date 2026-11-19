import type { NextRequest } from "next/server";
import { NotFoundError } from "@blueprint/domain";
import { getBlueprintRepository } from "@blueprint/database";
import { requireActor } from "@/lib/auth";
import { handleApiRoute } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exportId: string }> }
): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await requireActor(request, requestId);
    const { exportId } = await params;
    const repo = getBlueprintRepository();
    // Strictly enforce tenant + project access before serving private export bytes
    const exp = repo.getExport(actor, exportId);
    const blob = repo.state.exportBlobs.get(exp.id);
    if (!blob) {
      throw new NotFoundError("ExportArtifactBlob", exportId);
    }
    return new Response(Buffer.from(blob.bytes), {
      status: 200,
      headers: {
        "content-type": blob.mimeType,
        "content-disposition": `attachment; filename="${blob.fileName}"`,
        "cache-control": "private, no-store",
        "x-request-id": requestId,
      },
    });
  });
}
