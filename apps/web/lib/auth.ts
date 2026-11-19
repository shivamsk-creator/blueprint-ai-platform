import { cookies } from "next/headers";
import { UnauthorizedError, type WorkspaceRole } from "@blueprint/domain";
import {
  createSupabaseServerClient,
  DEMO_IDS,
  getBlueprintRepository,
  type ActorContext,
} from "@blueprint/database";
import { isSupabaseConfigured, parseWebEnv } from "@blueprint/validation";
import { BlueprintJobProcessor } from "../../worker/src/processor";

export const DEMO_ACTOR_COOKIE = "bp_demo_actor";
export const ACTIVE_WORKSPACE_COOKIE = "bp_workspace_id";

export interface SessionActor extends ActorContext {
  workspaceRole?: WorkspaceRole;
  isDemoMode: boolean;
}

export function isDemoModeEnabled(): boolean {
  const env = parseWebEnv(process.env);
  if (isSupabaseConfigured(env)) return false;
  return env.BLUEPRINT_DEMO_MODE !== "false";
}

export async function getOptionalActor(request?: Request, requestId?: string): Promise<SessionActor | null> {
  const env = parseWebEnv(process.env);

  // 1. Live Supabase Auth when configured
  if (isSupabaseConfigured(env)) {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient({
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        for (const item of toSet) {
          cookieStore.set(item.name, item.value, item.options);
        }
      },
    });
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const fullName =
      (data.user.user_metadata?.full_name as string | undefined) ??
      data.user.email?.split("@")[0] ??
      "User";
    return {
      userId: data.user.id,
      email: data.user.email ?? "",
      fullName,
      requestId,
      isDemoMode: false,
    };
  }

  // 2. Local / Test preview mode (never active when real Supabase credentials are set)
  if (!isDemoModeEnabled()) return null;

  // Allow test harness header override in non-production environments
  const headerActorId =
    process.env.NODE_ENV !== "production" ? request?.headers.get("x-blueprint-actor-id") : null;

  let cookieActorId: string | undefined;
  try {
    const cookieStore = await cookies();
    cookieActorId = cookieStore.get(DEMO_ACTOR_COOKIE)?.value;
  } catch {
    // Outside request cookie context (e.g. direct route unit test invocation)
  }

  if (cookieActorId === "signed_out" && !headerActorId) {
    return null;
  }

  const repo = getBlueprintRepository();
  const targetId = headerActorId || cookieActorId || DEMO_IDS.userOwner;
  const profile = repo.state.profiles.get(targetId);

  if (profile) {
    return {
      userId: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      requestId,
      isDemoMode: true,
    };
  }

  return null;
}

export async function requireActor(request?: Request, requestId?: string): Promise<SessionActor> {
  const actor = await getOptionalActor(request, requestId);
  if (!actor) {
    throw new UnauthorizedError("Please sign in to access Blueprint AI.");
  }
  return actor;
}

export async function resolveActiveWorkspaceId(actor: ActorContext, requestedWorkspaceId?: string | null): Promise<string> {
  const repo = getBlueprintRepository();
  const workspaces = repo.listWorkspaces(actor);

  if (requestedWorkspaceId && workspaces.some((w) => w.id === requestedWorkspaceId)) {
    return requestedWorkspaceId;
  }

  try {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
    if (fromCookie && workspaces.some((w) => w.id === fromCookie)) {
      return fromCookie;
    }
  } catch {
    // Direct test invocation without Next cookies
  }

  return workspaces[0]?.id ?? DEMO_IDS.workspaceA;
}

/**
 * In local or hosted demo mode without a separate worker daemon running, drain the
 * queued job inline before returning so serverless runtimes (e.g. Vercel Functions)
 * never freeze background work before completion.
 * In live Supabase mode, the dedicated `apps/worker` process consumes pgmq asynchronously.
 */
export async function triggerLocalWorkerIfDemo(): Promise<void> {
  if (!isDemoModeEnabled()) return;
  const repo = getBlueprintRepository();
  const processor = new BlueprintJobProcessor(repo, { allowSyntheticFallback: true });
  await processor.pollOnce(4, 120);
}
