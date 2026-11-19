import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  createSupabaseServerClient,
  DEMO_IDS,
  getBlueprintRepository,
} from "@blueprint/database";
import { isSupabaseConfigured, parseWebEnv } from "@blueprint/validation";
import { UnauthorizedError } from "@blueprint/domain";
import {
  ACTIVE_WORKSPACE_COOKIE,
  DEMO_ACTOR_COOKIE,
  getOptionalActor,
  resolveActiveWorkspaceId,
} from "@/lib/auth";
import { enforceRateLimit, handleApiRoute, jsonOk, parseJsonBody } from "@/lib/http";

const signInSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  demoActorId: z.string().optional(),
  workspaceId: z.string().optional(),
});

export async function GET(request: NextRequest): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const actor = await getOptionalActor(request, requestId);
    if (!actor) {
      return jsonOk({ authenticated: false, user: null, workspaces: [] }, 200, requestId);
    }
    const repo = getBlueprintRepository();
    const workspaces = repo.listWorkspaces(actor);
    const activeWorkspaceId = await resolveActiveWorkspaceId(actor);
    const activeWs = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];
    return jsonOk(
      {
        authenticated: true,
        isDemoMode: actor.isDemoMode,
        user: {
          id: actor.userId,
          email: actor.email,
          fullName: actor.fullName,
          role: activeWs?.role ?? "contributor",
        },
        activeWorkspaceId: activeWs?.id ?? null,
        workspaces,
        demoActors: actor.isDemoMode
          ? [
              { id: DEMO_IDS.userOwner, label: "Alex Mercer", role: "owner" },
              { id: DEMO_IDS.userContributor, label: "Priya Nair", role: "contributor" },
              { id: DEMO_IDS.userReviewer, label: "Marcus Vance", role: "reviewer" },
              { id: DEMO_IDS.userTenantB, label: "Sofia Reyes (Tenant B)", role: "owner" },
            ]
          : [],
      },
      200,
      requestId
    );
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    enforceRateLimit(`auth:signin:${ip}`, 20, 60_000);
    const body = await parseJsonBody(request, signInSchema);
    const env = parseWebEnv(process.env);

    // Workspace switch only
    if (body.workspaceId && !body.email && !body.demoActorId) {
      const res = jsonOk({ ok: true, activeWorkspaceId: body.workspaceId }, 200, requestId);
      res.cookies.set(ACTIVE_WORKSPACE_COOKIE, body.workspaceId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      return res;
    }

    if (isSupabaseConfigured(env)) {
      if (!body.email || !body.password) {
        throw new UnauthorizedError("Email and password are required.");
      }
      const cookieStore = await cookies();
      const supabase = createSupabaseServerClient({
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          for (const item of toSet) cookieStore.set(item.name, item.value, item.options);
        },
      });
      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });
      if (error || !data.user) {
        throw new UnauthorizedError(error?.message || "Invalid email or password.");
      }
      return jsonOk({ ok: true, userId: data.user.id }, 200, requestId);
    }

    // Local preview sign-in / demo role switcher
    const repo = getBlueprintRepository();
    let actorId = body.demoActorId;
    if (!actorId && body.email) {
      const matched = Array.from(repo.state.profiles.values()).find(
        (p) => p.email.toLowerCase() === body.email!.toLowerCase()
      );
      actorId = matched?.id ?? DEMO_IDS.userOwner;
    }
    const resolvedId = actorId || DEMO_IDS.userOwner;
    const profile = repo.state.profiles.get(resolvedId);
    if (!profile) {
      throw new UnauthorizedError("Invalid credentials.");
    }

    const res = NextResponse.json(
      { ok: true, user: { id: profile.id, email: profile.email, fullName: profile.fullName } },
      { status: 200, headers: { "x-request-id": requestId } }
    );
    res.cookies.set(DEMO_ACTOR_COOKIE, profile.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    if (body.workspaceId) {
      res.cookies.set(ACTIVE_WORKSPACE_COOKIE, body.workspaceId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }
    return res;
  });
}

export async function DELETE(request: NextRequest): Promise<Response> {
  return handleApiRoute(request, async ({ requestId }) => {
    const env = parseWebEnv(process.env);
    if (isSupabaseConfigured(env)) {
      const cookieStore = await cookies();
      const supabase = createSupabaseServerClient({
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          for (const item of toSet) cookieStore.set(item.name, item.value, item.options);
        },
      });
      await supabase.auth.signOut();
    }
    const res = jsonOk({ ok: true }, 200, requestId);
    res.cookies.set(DEMO_ACTOR_COOKIE, "signed_out", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return res;
  });
}
