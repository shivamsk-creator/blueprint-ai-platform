"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { AIUsageRecord } from "@blueprint/domain";
import { Card, CardBody, CardHeader, DataTable, ErrorState, MetricTile, SkeletonBlock } from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

interface UsagePayload {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCostUsd: number;
  byModel: Array<{ modelId: string; requests: number; tokens: number; costUsd: number }>;
  byTask: Array<{ taskType: string; requests: number; tokens: number; costUsd: number }>;
  records: AIUsageRecord[];
}

export default function WorkspaceAIUsagePage() {
  const [data, setData] = useState<UsagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<UsagePayload>("/api/settings/ai-usage"));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load AI usage.");
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

  if (loading) return <SkeletonBlock className="h-64 w-full" />;
  if (error || !data) return <ErrorState message={error ?? "Unable to load usage."} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Workspace AI Usage & Cost Attribution</h1>
        <p className="text-sm text-[#64748b]">
          Server-recorded token usage and estimated/reconciled costs per task and model (never client-reported).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Total AI Runs" value={data.totalRequests} accent="cobalt" />
        <MetricTile label="Input Tokens" value={data.totalInputTokens.toLocaleString()} accent="cobalt" />
        <MetricTile label="Output Tokens" value={data.totalOutputTokens.toLocaleString()} accent="emerald" />
        <MetricTile label="Total Cost (USD)" value={`$${data.totalEstimatedCostUsd.toFixed(4)}`} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Breakdown by Model" />
          <CardBody>
            <DataTable
              rows={data.byModel}
              getRowKey={(r) => r.modelId}
              columns={[
                { key: "model", header: "Model", render: (r) => <span className="font-mono text-xs">{r.modelId}</span> },
                { key: "req", header: "Runs", align: "right", render: (r) => r.requests },
                { key: "tok", header: "Tokens", align: "right", render: (r) => r.tokens.toLocaleString() },
                { key: "cost", header: "Cost", align: "right", render: (r) => `$${r.costUsd.toFixed(4)}` },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Breakdown by Task Type" />
          <CardBody>
            <DataTable
              rows={data.byTask}
              getRowKey={(r) => r.taskType}
              columns={[
                { key: "task", header: "Task", render: (r) => <span className="font-mono text-xs">{r.taskType}</span> },
                { key: "req", header: "Runs", align: "right", render: (r) => r.requests },
                { key: "tok", header: "Tokens", align: "right", render: (r) => r.tokens.toLocaleString() },
                { key: "cost", header: "Cost", align: "right", render: (r) => `$${r.costUsd.toFixed(4)}` },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
