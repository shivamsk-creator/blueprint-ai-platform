"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { AuditLog } from "@blueprint/domain";
import { DataTable, ErrorState } from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function ProjectActivityPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ logs: AuditLog[] }>(`/api/projects/${projectId}/activity`);
      setLogs(res.logs);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load activity.");
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

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Project Activity & Audit Log</h1>
        <p className="text-sm text-[#64748b]">Chronological, append-only timeline of all mutations, approvals, and generated artifacts.</p>
      </div>
      <DataTable
        loading={loading}
        rows={logs}
        getRowKey={(l) => l.id}
        columns={[
          { key: "action", header: "Event", render: (l) => <span className="font-mono text-xs font-semibold text-[#1d4ed8]">{l.action}</span> },
          { key: "actor", header: "Actor", render: (l) => <span className="text-xs">{l.actorName ?? "System"}</span> },
          { key: "entity", header: "Target", render: (l) => <span className="font-mono text-xs text-[#475569]">{l.entityType}:{l.entityId.slice(0, 8)}</span> },
          { key: "ts", header: "Timestamp", align: "right", render: (l) => <span className="font-mono text-xs text-[#64748b]">{new Date(l.createdAt).toLocaleString()}</span> },
        ]}
      />
    </div>
  );
}
