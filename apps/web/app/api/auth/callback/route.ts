import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@blueprint/database";
import { isSupabaseConfigured, parseWebEnv } from "@blueprint/validation";

export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const env = parseWebEnv(process.env);

  if (code && isSupabaseConfigured(env)) {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient({
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        for (const item of toSet) cookieStore.set(item.name, item.value, item.options);
      },
    });
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(safeNext, request.url));
}
