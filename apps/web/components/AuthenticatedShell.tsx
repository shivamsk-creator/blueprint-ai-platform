"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ProjectStage, Workspace, WorkspaceRole } from "@blueprint/domain";
import { AppShell, ErrorState, ProjectSidebar, SkeletonBlock } from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

interface SessionPayload {
  authenticated: boolean;
  isDemoMode: boolean;
  user: { id: string; email: string; fullName: string; role: WorkspaceRole } | null;
  activeWorkspaceId: string | null;
  workspaces: Array<Workspace & { role: WorkspaceRole }>;
  demoActors: Array<{ id: string; label: string; role: WorkspaceRole }>;
}

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [projectMeta, setProjectMeta] = useState<{ id: string; name: string; stages: ProjectStage[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectId =
    projectMatch?.[1] && projectMatch[1] !== "new" ? projectMatch[1] : null;

  const fetchSession = useCallback(async () => {
    try {
      const data = await apiFetch<SessionPayload>("/api/auth/session");
      if (!data.authenticated || !data.user) {
        router.replace(`/sign-in?redirectTo=${encodeURIComponent(pathname)}`);
        return;
      }
      setError(null);
      setSession(data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load session.");
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    let active = true;
    void apiFetch<SessionPayload>("/api/auth/session")
      .then((data) => {
        if (!active) return;
        if (!data.authenticated || !data.user) {
          router.replace(`/sign-in?redirectTo=${encodeURIComponent(pathname)}`);
          return;
        }
        setError(null);
        setSession(data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof ApiClientError ? err.message : "Failed to load session.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!projectId || !session?.authenticated) {
      return;
    }
    let cancelled = false;
    void apiFetch<{ project: { id: string; name: string; stages: ProjectStage[] } }>(
      `/api/projects/${projectId}`
    )
      .then((res) => {
        if (!cancelled) setProjectMeta(res.project);
      })
      .catch(() => {
        if (!cancelled) setProjectMeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, session?.authenticated]);

  const activeProjectMeta =
    projectId && session?.authenticated && projectMeta?.id === projectId ? projectMeta : null;

  const handleWorkspaceChange = async (workspaceId: string): Promise<void> => {
    await apiFetch("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ workspaceId }),
    });
    router.push("/dashboard");
    router.refresh();
  };

  const handleSwitchDemoActor = async (demoActorId: string): Promise<void> => {
    await apiFetch("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ demoActorId }),
    });
    await fetchSession();
    router.refresh();
  };

  const handleSignOut = async (): Promise<void> => {
    await apiFetch("/api/auth/session", { method: "DELETE" });
    router.replace("/sign-in");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#f6f8fb]">
        <div className="hidden w-60 bg-[#0b1220] p-4 lg:block">
          <SkeletonBlock className="h-8 w-36 bg-slate-800" />
          <div className="mt-6 space-y-2">
            <SkeletonBlock className="h-8 w-full bg-slate-800" />
            <SkeletonBlock className="h-8 w-full bg-slate-800" />
            <SkeletonBlock className="h-8 w-full bg-slate-800" />
          </div>
        </div>
        <div className="flex-1 space-y-4 p-8">
          <SkeletonBlock className="h-10 w-64" />
          <SkeletonBlock className="h-44 w-full" />
        </div>
      </div>
    );
  }

  if (error || !session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <ErrorState
            message={error ?? "Unable to establish authenticated session."}
            onRetry={() => {
              setLoading(true);
              setError(null);
              void fetchSession();
            }}
          />
        </div>
      </div>
    );
  }

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const label =
      activeProjectMeta && seg === activeProjectMeta.id
        ? activeProjectMeta.name
        : seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return { label, href: idx < segments.length - 1 ? href : undefined };
  });

  return (
    <AppShell
      workspaces={session.workspaces}
      activeWorkspaceId={session.activeWorkspaceId ?? ""}
      onSelectWorkspace={handleWorkspaceChange}
      user={session.user}
      demoActors={session.demoActors}
      activeActorId={session.user.id}
      onSwitchDemoActor={handleSwitchDemoActor}
      onSignOut={handleSignOut}
      currentPath={pathname}
      breadcrumbs={breadcrumbs}
      renderLink={(href, node, className) => (
        <Link href={href} className={className}>
          {node}
        </Link>
      )}
      secondarySidebar={
        activeProjectMeta ? (
          <ProjectSidebar
            projectId={activeProjectMeta.id}
            projectName={activeProjectMeta.name}
            currentPath={pathname}
            stages={activeProjectMeta.stages}
            renderLink={(href, node, className) => (
              <Link href={href} className={className}>
                {node}
              </Link>
            )}
          />
        ) : undefined
      }
    >
      {children}
    </AppShell>
  );
}
