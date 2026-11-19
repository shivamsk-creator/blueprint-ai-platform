"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LIFECYCLE_STAGES, type Project, type ProjectStage } from "@blueprint/domain";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  MetricTile,
  SkeletonBlock,
  StatusBadge,
} from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

type ProjectDetail = Project & {
  stages: ProjectStage[];
  stats: {
    requirementsCount: number;
    confirmedRequirementsCount: number;
    artifactsWithRevisions: number;
    openValidationIssues: number;
    coveragePct: number;
  };
};

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ project: ProjectDetail }>(`/api/projects/${projectId}`);
      setProject(res.project);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load project.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) return <SkeletonBlock className="h-80 w-full" />;
  if (error || !project) return <ErrorState message={error ?? "Project not found."} onRetry={() => void load()} />;

  const stageMap = new Map(project.stages.map((s) => [s.stageKey, s]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="mt-1 max-w-3xl text-sm text-[#475569]">{project.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/projects/${projectId}/discovery`}>
            <Button variant="outline">Discovery Studio</Button>
          </Link>
          <Link href={`/projects/${projectId}/artifacts/brd`}>
            <Button variant="outline">Open BRD</Button>
          </Link>
          <Link href={`/projects/${projectId}/exports`}>
            <Button>Export Center</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile
          label="Requirements"
          value={`${project.stats.confirmedRequirementsCount}/${project.stats.requirementsCount}`}
          hint="Confirmed / Total"
          accent="cobalt"
        />
        <MetricTile
          label="Active Artifacts"
          value={`${project.stats.artifactsWithRevisions}/9`}
          hint="Versioned specifications"
          accent="cobalt"
        />
        <MetricTile
          label="Traceability Coverage"
          value={`${project.stats.coveragePct}%`}
          hint="Requirements → Features/Tasks/QA"
          accent={project.stats.coveragePct >= 75 ? "emerald" : "amber"}
        />
        <MetricTile
          label="Open Validation Issues"
          value={project.stats.openValidationIssues}
          hint="Latest validation run"
          accent={project.stats.openValidationIssues === 0 ? "emerald" : "crimson"}
        />
      </div>

      <Card>
        <CardHeader
          title="10-Stage Blueprint Lifecycle"
          subtitle="Track completion from Idea & Discovery through Technical Design, Validation, and Export."
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {LIFECYCLE_STAGES.map((stage, idx) => {
              const record = stageMap.get(stage.key);
              const href = `/projects/${projectId}${stage.routeSegment}`;
              return (
                <Link
                  key={stage.key}
                  href={href}
                  className="flex flex-col justify-between rounded-[10px] border border-[#dce3ee] bg-[#f8fafc] p-3.5 transition-all hover:border-[#1d4ed8] hover:bg-white"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#64748b]">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <StatusBadge status={record?.status ?? "not_started"} />
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-[#0f172a]">{stage.label}</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#64748b]">{stage.description}</p>
                  </div>
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                      <div
                        className="h-full rounded-full bg-[#1d4ed8]"
                        style={{ width: `${record?.progressPct ?? 0}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
