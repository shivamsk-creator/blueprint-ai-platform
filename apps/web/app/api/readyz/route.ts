import { isSupabaseConfigured, parseWebEnv } from "@blueprint/validation";
import { jsonOk } from "@/lib/http";

export async function GET(): Promise<Response> {
  const env = parseWebEnv(process.env);
  const supabaseLive = isSupabaseConfigured(env);
  return jsonOk({
    status: "ready",
    mode: supabaseLive ? "supabase" : "local_preview",
    supabaseConfigured: supabaseLive,
    timestamp: new Date().toISOString(),
  });
}
