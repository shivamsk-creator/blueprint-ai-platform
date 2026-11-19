import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createSupabaseServerClient, getBlueprintRepository } from "@blueprint/database";
import { isSupabaseConfigured, parseWebEnv } from "@blueprint/validation";
import { ConflictError } from "@blueprint/domain";
import { DEMO_ACTOR_COOKIE } from "@/lib/auth";
import { enforceRateLimit, handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

const signUpSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(120),
});

export async function POST(request: NextRequest): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    enforceRateLimit(`auth:signup:${ip}`, 10, 60_000);
    const body = await parseJsonBody(request, signUpSchema);
    const env = parseWebEnv(process.env);

    if (isSupabaseConfigured(env)) {
      const cookieStore = await cookies();
      const supabase = createSupabaseServerClient({
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          for (const item of toSet) cookieStore.set(item.name, item.value, item.options);
        },
      });
      const { data, error } = await supabase.auth.signUp({
        email: body.email,
        password: body.password,
        options: {
          data: { full_name: body.fullName },
          emailRedirectTo: `${env.APP_URL}/api/auth/callback`,
        },
      });
      if (error) {
        throw new ConflictError(error.message);
      }
      return jsonOk(
        { ok: true, userId: data.user?.id ?? null, verificationRequired: !data.session },
        201,
        requestId
      );
    }

    const repo = getBlueprintRepository();
    const existing = Array.from(repo.state.profiles.values()).find(
      (p) => p.email.toLowerCase() === body.email.toLowerCase()
    );
    if (existing) {
      throw new ConflictError("An account with this email already exists.");
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    repo.state.profiles.set(id, {
      id,
      email: body.email.toLowerCase(),
      fullName: body.fullName,
      preferences: {},
      createdAt: now,
      updatedAt: now,
    });
    const res = NextResponse.json(
      { ok: true, userId: id, verificationRequired: false },
      { status: 201, headers: { "x-request-id": requestId } }
    );
    res.cookies.set(DEMO_ACTOR_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
    return res;
  });
}
