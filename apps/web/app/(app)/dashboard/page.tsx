"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import type { Project } from "@blueprint/domain";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  MetricTile,
  SkeletonBlock,
  StatusBadge,
} from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

interface UsageSummary {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCostUsd: number;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [projRes, usageRes] = await Promise.all([
        apiFetch<{ projects: Project[] }>("/api/projects"),
        apiFetch<UsageSummary>("/api/settings/ai-usage"),
      ]);
      setProjects(projRes.projects);
      setUsage(usageRes);
      setError(null);
    } catch (err) {
      setError({
        message: err instanceof ApiClientError ? err.message : "Failed to load dashboard.",
        requestId: err instanceof ApiClientError ? err.requestId : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-9 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
        <SkeletonBlock className="h-64" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} requestId={error.requestId} onRetry={() => void load()} />;
  }

  const activeProjects = projects.filter((p) => p.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Workspace Dashboard</h1>
          <p className="mt-0.5 text-sm text-[#64748b]">
            Live overview of active software blueprints, governance readiness, and AI consumption.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/onboarding">
            <Button variant="outline">New Workspace</Button>
          </Link>
          <Link href="/projects/new">
            <Button>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Active Blueprints" value={activeProjects.length} hint={`${projects.length} total in workspace`} accent="cobalt" />
        <MetricTile label="AI Requests" value={usage?.totalRequests ?? 0} hint="Attributed across tasks" accent="cobalt" />
        <MetricTile
          label="Total Tokens"
          value={((usage?.totalInputTokens ?? 0) + (usage?.totalOutputTokens ?? 0)).toLocaleString()}
          hint="Input + output tokens"
          accent="emerald"
        />
        <MetricTile
          label="Est. AI Spend"
          value={`$${(usage?.totalEstimatedCostUsd ?? 0).toFixed(4)}`}
          hint="Server-computed cost"
          accent="amber"
        />
      </div>

      <Card>
        <CardHeader
          title="Recent Projects"
          subtitle="Jump directly into discovery, BRD/PRD specifications, architecture, or validation."
          action={
            <Link href="/projects" className="text-xs font-semibold text-[#1d4ed8] hover:underline">
              View all projects
            </Link>
          }
        />
        <CardBody>
          {projects.length === 0 ? (
            <EmptyState
              title="No projects in this workspace yet"
              description="Start your first software blueprint to run structured discovery, generate BRD/PRD revisions, and design technical architecture."
              action={
                <Link href="/projects/new">
                  <Button>Create First Project</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {projects.map((proj) => (
                <Link
                  key={proj.id}
                  href={`/projects/${proj.id}`}
                  className="group rounded-[10px] border border-[#dce3ee] bg-[#f8fafc] p-4 transition-all hover:border-[#1d4ed8] hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#0f172a] group-hover:text-[#1d4ed8]">
                          {proj.name}
                        </h3>
                        <StatusBadge status={proj.status} />
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-[#64748b]">{proj.slug}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-[#94a3b8] group-hover:text-[#1d4ed8]" />
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-[#475569]">
                    {proj.description || "No initial charter description added yet."}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
