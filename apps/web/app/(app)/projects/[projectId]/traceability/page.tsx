"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { DevelopmentTask, Feature, Requirement, TestCase, TraceabilityMatrixReport } from "@blueprint/domain";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  FeedbackBanner,
  FieldLabel,
  Select,
  SkeletonBlock,
  TraceabilityMatrix,
} from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function TraceabilityPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [matrix, setMatrix] = useState<TraceabilityMatrixReport | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [tasks, setTasks] = useState<DevelopmentTask[]>([]);
  const [tests, setTests] = useState<TestCase[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [targetKind, setTargetKind] = useState<"feature" | "development_task" | "test_case">("test_case");
  const [targetId, setTargetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [matRes, reqRes, featRes, taskRes, testRes] = await Promise.all([
        apiFetch<{ matrix: TraceabilityMatrixReport }>(`/api/projects/${projectId}/traceability`),
        apiFetch<{ requirements: Requirement[] }>(`/api/projects/${projectId}/requirements`),
        apiFetch<{ features: Feature[] }>(`/api/projects/${projectId}/features`),
        apiFetch<{ tasks: DevelopmentTask[] }>(`/api/projects/${projectId}/development-tasks`),
        apiFetch<{ testCases: TestCase[] }>(`/api/projects/${projectId}/test-cases`),
      ]);
      setMatrix(matRes.matrix);
      setRequirements(reqRes.requirements);
      setFeatures(featRes.features);
      setTasks(taskRes.tasks);
      setTests(testRes.testCases);
      setSourceId((prev) => prev || reqRes.requirements[0]?.id || "");
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load traceability matrix.");
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

  const targetOptions =
    targetKind === "feature"
      ? features.map((f) => ({ id: f.id, label: `${f.featureKey} — ${f.name}` }))
      : targetKind === "development_task"
      ? tasks.map((t) => ({ id: t.id, label: `${t.taskKey} — ${t.title}` }))
      : tests.map((tc) => ({ id: tc.id, label: `${tc.testKey} — ${tc.title}` }));

  const handleLink = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const chosenTarget = targetId || targetOptions[0]?.id;
    if (!sourceId || !chosenTarget) return;
    await apiFetch(`/api/projects/${projectId}/traceability`, {
      method: "POST",
      body: JSON.stringify({
        sourceType: "requirement",
        sourceId,
        targetType: targetKind,
        targetId: chosenTarget,
        relationType: targetKind === "test_case" ? "verifies" : "implements",
      }),
    });
    setFeedback("Traceability link created and coverage matrix recomputed.");
    await load();
  };

  if (loading) return <SkeletonBlock className="h-80 w-full" />;
  if (error || !matrix) return <ErrorState message={error ?? "Unable to load matrix."} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Traceability Matrix</h1>
        <p className="text-sm text-[#64748b]">Real requirement-to-delivery coverage computed strictly from same-project validated entity links.</p>
      </div>
      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      <Card>
        <CardHeader title="Link Requirement to Downstream Entity" />
        <CardBody>
          <form onSubmit={handleLink} className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-4">
              <FieldLabel htmlFor="tr-req">Requirement</FieldLabel>
              <Select id="tr-req" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                {requirements.map((r) => (
                  <option key={r.id} value={r.id}>{r.requirementKey} — {r.title}</option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-3">
              <FieldLabel htmlFor="tr-kind">Target Type</FieldLabel>
              <Select
                id="tr-kind"
                value={targetKind}
                onChange={(e) => {
                  setTargetKind(e.target.value as typeof targetKind);
                  setTargetId("");
                }}
              >
                <option value="feature">MVP Feature</option>
                <option value="development_task">Development Task</option>
                <option value="test_case">QA Test Case</option>
              </Select>
            </div>
            <div className="md:col-span-3">
              <FieldLabel htmlFor="tr-target">Target Entity</FieldLabel>
              <Select id="tr-target" value={targetId || targetOptions[0]?.id || ""} onChange={(e) => setTargetId(e.target.value)}>
                {targetOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-end md:col-span-2">
              <Button type="submit" className="w-full">Create Link</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <TraceabilityMatrix
        matrix={matrix}
        onSelectRequirement={(reqId) => router.push(`/projects/${projectId}/requirements/${reqId}`)}
      />
    </div>
  );
}
