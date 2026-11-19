import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createSupabaseServerClient } from "@blueprint/database";
import { isSupabaseConfigured, parseWebEnv } from "@blueprint/validation";
import { enforceRateLimit, handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

const forgotSchema = z.object({ email: z.string().trim().email() });

export async function POST(request: NextRequest): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    enforceRateLimit(`auth:forgot:${ip}`, 10, 60_000);
    const body = await parseJsonBody(request, forgotSchema);
    const env = parseWebEnv(process.env);

    if (isSupabaseConfigured(env)) {
      const cookieStore = await cookies();
      const supabase = createSupabaseServerClient({
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          for (const item of toSet) cookieStore.set(item.name, item.value, item.options);
        },
      });
      await supabase.auth.resetPasswordForEmail(body.email, {
        redirectTo: `${env.APP_URL}/sign-in`,
      });
    }

    // Always return generic success message to prevent email enumeration
    return jsonOk(
      {
        ok: true,
        message: "If an account exists for that email address, a password reset link has been sent.",
      },
      200,
      requestId
    );
  });
}
