"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { AuditLog } from "@blueprint/domain";
import { DataTable, ErrorState } from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function AuditSettingsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ logs: AuditLog[] }>("/api/settings/audit");
      setLogs(res.logs);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load audit log.");
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

  if (error) return <ErrorState title="Admin Audit Access Required" message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Workspace Audit Trail</h1>
        <p className="text-sm text-[#64748b]">
          Append-only security and governance log across approvals, credentials, requirements, and exports.
        </p>
      </div>
      <DataTable
        loading={loading}
        rows={logs}
        getRowKey={(l) => l.id}
        searchPlaceholder="Filter audit events by action, actor, or entity..."
        searchFilter={(l, q) =>
          l.action.toLowerCase().includes(q) ||
          (l.actorName ?? "").toLowerCase().includes(q) ||
          l.entityType.toLowerCase().includes(q)
        }
        columns={[
          { key: "action", header: "Action", render: (l) => <span className="font-mono text-xs font-semibold text-[#1d4ed8]">{l.action}</span> },
          { key: "actor", header: "Actor", render: (l) => <span className="text-xs font-medium">{l.actorName ?? l.actorUserId ?? "System"}</span> },
          { key: "entity", header: "Entity", render: (l) => <span className="font-mono text-xs text-[#475569]">{l.entityType}:{l.entityId.slice(0, 8)}</span> },
          { key: "time", header: "Timestamp (UTC)", align: "right", render: (l) => <span className="font-mono text-xs text-[#64748b]">{new Date(l.createdAt).toLocaleString()}</span> },
        ]}
      />
    </div>
  );
}
