"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AI_TASK_TYPES, type AIModel, type AITaskPolicy, type AITaskType } from "@blueprint/domain";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  ErrorState,
  FeedbackBanner,
  Select,
  StatusBadge,
} from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function AIModelsSettingsPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [policies, setPolicies] = useState<AITaskPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTask, setSavingTask] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ models: AIModel[]; policies: AITaskPolicy[] }>("/api/settings/ai-models");
      setModels(res.models);
      setPolicies(res.policies);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load model catalog.");
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

  const policyByTask = new Map(policies.map((p) => [p.taskType, p]));

  const updatePolicy = async (
    taskType: AITaskType,
    updates: { defaultModelId?: string | null; fallbackModelId?: string | null; allowUserOverride: boolean }
  ): Promise<void> => {
    setSavingTask(taskType);
    setFeedback(null);
    try {
      const existing = policyByTask.get(taskType);
      const { policy } = await apiFetch<{ policy: AITaskPolicy }>(`/api/settings/ai-task-policies/${taskType}`, {
        method: "PUT",
        body: JSON.stringify({
          defaultModelId: updates.defaultModelId || null,
          fallbackModelId: updates.fallbackModelId || null,
          allowedModelIds: existing?.allowedModelIds ?? [],
          allowUserOverride: updates.allowUserOverride,
          maxTokens: existing?.maxTokens ?? 8192,
          monthlyBudgetUsd: existing?.monthlyBudgetUsd ?? null,
        }),
      });
      setPolicies((prev) => {
        const rest = prev.filter((p) => p.taskType !== taskType);
        return [...rest, policy];
      });
      setFeedback({ tone: "success", message: `Updated policy for "${taskType}".` });
    } catch (err) {
      setFeedback({ tone: "error", message: err instanceof ApiClientError ? err.message : "Policy rejected." });
    } finally {
      setSavingTask(null);
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Model Catalogue & Task Defaults</h1>
        <p className="text-sm text-[#64748b]">
          Assign workspace default models, fallback models, and per-task override rules. Incompatible models are rejected server-side.
        </p>
      </div>
      {feedback && <FeedbackBanner tone={feedback.tone} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <Card>
        <CardHeader title="Enabled Workspace Models & Capabilities" />
        <CardBody>
          <DataTable
            loading={loading}
            rows={models}
            getRowKey={(m) => m.id}
            columns={[
              {
                key: "model",
                header: "Model",
                render: (m) => (
                  <div>
                    <div className="font-semibold text-[#0f172a]">{m.displayName}</div>
                    <div className="font-mono text-xs text-[#64748b]">{m.modelId}</div>
                  </div>
                ),
              },
              { key: "provider", header: "Provider", render: (m) => <StatusBadge status="info" label={m.providerType ?? "provider"} /> },
              {
                key: "caps",
                header: "Capabilities",
                render: (m) => (
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {m.capabilities.structuredOutput && <span className="rounded bg-[#ecfdf5] px-1.5 py-0.5 font-semibold text-[#047857]">JSON</span>}
                    {m.capabilities.longContext && <span className="rounded bg-[#eff6ff] px-1.5 py-0.5 font-semibold text-[#1d4ed8]">Long Context</span>}
                    {m.capabilities.reasoning && <span className="rounded bg-[#fffbeb] px-1.5 py-0.5 font-semibold text-[#b45309]">Reasoning</span>}
                    {!m.capabilities.structuredOutput && <span className="rounded bg-[#fff1f2] px-1.5 py-0.5 font-semibold text-[#be123c]">No Structured Output</span>}
                  </div>
                ),
              },
              {
                key: "price",
                header: "In / Out per 1M",
                align: "right",
                render: (m) => <span className="font-mono text-xs">${m.inputCostPer1mUsd} / ${m.outputCostPer1mUsd}</span>,
              },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Per-Task Routing & Fallback Policies" subtitle="Changes apply immediately to new queued AI jobs." />
        <CardBody className="divide-y divide-[#eef2f7]">
          {AI_TASK_TYPES.map((taskType) => {
            const pol = policyByTask.get(taskType);
            return (
              <div key={taskType} className="grid grid-cols-1 items-center gap-3 py-3 lg:grid-cols-12">
                <div className="lg:col-span-3">
                  <div className="font-mono text-xs font-semibold text-[#0f172a]">{taskType}</div>
                </div>
                <div className="lg:col-span-3">
                  <Select
                    aria-label={`Default model for ${taskType}`}
                    value={pol?.defaultModelId ?? ""}
                    onChange={(e) =>
                      void updatePolicy(taskType, {
                        defaultModelId: e.target.value || null,
                        fallbackModelId: pol?.fallbackModelId ?? null,
                        allowUserOverride: pol?.allowUserOverride ?? true,
                      })
                    }
                  >
                    <option value="">Auto-select compatible</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>{m.displayName}</option>
                    ))}
                  </Select>
                </div>
                <div className="lg:col-span-3">
                  <Select
                    aria-label={`Fallback model for ${taskType}`}
                    value={pol?.fallbackModelId ?? ""}
                    onChange={(e) =>
                      void updatePolicy(taskType, {
                        defaultModelId: pol?.defaultModelId ?? null,
                        fallbackModelId: e.target.value || null,
                        allowUserOverride: pol?.allowUserOverride ?? true,
                      })
                    }
                  >
                    <option value="">No fallback</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>{m.displayName}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-2 lg:col-span-3">
                  <label className="flex items-center gap-1.5 text-xs text-[#334155]">
                    <input
                      type="checkbox"
                      checked={pol?.allowUserOverride ?? true}
                      onChange={(e) =>
                        void updatePolicy(taskType, {
                          defaultModelId: pol?.defaultModelId ?? null,
                          fallbackModelId: pol?.fallbackModelId ?? null,
                          allowUserOverride: e.target.checked,
                        })
                      }
                    />
                    Allow override
                  </label>
                  {savingTask === taskType && <Button size="sm" variant="ghost" loading>Saving</Button>}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
