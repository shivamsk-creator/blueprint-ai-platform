import { jsonOk } from "@/lib/http";

export async function GET(): Promise<Response> {
  return jsonOk({
    status: "ok",
    service: "blueprint-web",
    timestamp: new Date().toISOString(),
  });
}
