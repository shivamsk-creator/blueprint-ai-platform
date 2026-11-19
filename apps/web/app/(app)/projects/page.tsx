"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Project } from "@blueprint/domain";
import { Button, DataTable, ErrorState, StatusBadge } from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ projects: Project[] }>("/api/projects");
      setProjects(res.projects);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to fetch projects.");
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

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Projects</h1>
          <p className="text-sm text-[#64748b]">All software blueprints scoped to the active workspace tenant.</p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Project
          </Button>
        </Link>
      </div>

      <DataTable
        loading={loading}
        rows={projects}
        getRowKey={(p) => p.id}
        searchPlaceholder="Search projects by name or slug..."
        searchFilter={(p, q) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        }
        onRowClick={(p) => router.push(`/projects/${p.id}`)}
        emptyTitle="No matching projects"
        emptyDescription="Create a new project to initialize the 10-stage Blueprint AI lifecycle."
        emptyAction={
          <Link href="/projects/new">
            <Button>Create Project</Button>
          </Link>
        }
        columns={[
          {
            key: "name",
            header: "Project",
            sortable: true,
            sortValue: (p) => p.name,
            render: (p) => (
              <div>
                <div className="font-semibold text-[#0f172a]">{p.name}</div>
                <div className="font-mono text-xs text-[#64748b]">{p.slug}</div>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            sortValue: (p) => p.status,
            render: (p) => <StatusBadge status={p.status} />,
          },
          {
            key: "access",
            header: "Access",
            render: (p) => (
              <span className="text-xs text-[#475569]">
                {p.restrictedAccess ? "Project-Restricted" : "Workspace Members"}
              </span>
            ),
          },
          {
            key: "updated",
            header: "Last Updated",
            align: "right",
            sortable: true,
            sortValue: (p) => p.updatedAt,
            render: (p) => (
              <span className="font-mono text-xs text-[#64748b]">
                {new Date(p.updatedAt).toLocaleDateString()}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
