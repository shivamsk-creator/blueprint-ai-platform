"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Feature } from "@blueprint/domain";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  FeedbackBanner,
  FieldLabel,
  Input,
  Select,
  SkeletonBlock,
  StatusBadge,
  Textarea,
} from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function ScopePlannerPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [name, setName] = useState("");
  const [scopeBucket, setScopeBucket] = useState<Feature["scopeBucket"]>("mvp");
  const [priority, setPriority] = useState<Feature["priority"]>("high");
  const [effortEstimate, setEffortEstimate] = useState<Feature["effortEstimate"]>("M");
  const [rationale, setRationale] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ features: Feature[] }>(`/api/projects/${projectId}/features`);
      setFeatures(res.features);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load features.");
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

  const handleAdd = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const { feature } = await apiFetch<{ feature: Feature }>(`/api/projects/${projectId}/features`, {
      method: "POST",
      body: JSON.stringify({ name, description: rationale, scopeBucket, priority, effortEstimate, rationale }),
    });
    setFeatures((prev) => [...prev, feature]);
    setName("");
    setRationale("");
    setFeedback(`Added ${feature.featureKey} to "${feature.scopeBucket}".`);
  };

  if (loading) return <SkeletonBlock className="h-72 w-full" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  const buckets: Array<{ key: Feature["scopeBucket"]; title: string }> = [
    { key: "mvp", title: "MVP In-Scope" },
    { key: "phase_2", title: "Phase 2" },
    { key: "deferred", title: "Deferred" },
    { key: "excluded", title: "Excluded" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">MVP Scope Planner</h1>
        <p className="text-sm text-[#64748b]">Classify features across MVP, Phase 2, Deferred, and Excluded buckets with explicit rationale.</p>
      </div>
      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      <Card>
        <CardHeader title="Add Scoped Feature" />
        <CardBody>
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <FieldLabel htmlFor="feat-name" required>Feature Name</FieldLabel>
              <Input id="feat-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="feat-bucket">Bucket</FieldLabel>
              <Select id="feat-bucket" value={scopeBucket} onChange={(e) => setScopeBucket(e.target.value as Feature["scopeBucket"])}>
                <option value="mvp">MVP</option>
                <option value="phase_2">Phase 2</option>
                <option value="deferred">Deferred</option>
                <option value="excluded">Excluded</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="feat-pri">Priority</FieldLabel>
              <Select id="feat-pri" value={priority} onChange={(e) => setPriority(e.target.value as Feature["priority"])}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </div>
            <div className="md:col-span-1">
              <FieldLabel htmlFor="feat-eff">Size</FieldLabel>
              <Select id="feat-eff" value={effortEstimate} onChange={(e) => setEffortEstimate(e.target.value as Feature["effortEstimate"])}>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
              </Select>
            </div>
            <div className="flex items-end md:col-span-2">
              <Button type="submit" className="w-full">Add</Button>
            </div>
            <div className="md:col-span-12">
              <FieldLabel htmlFor="feat-rat">Inclusion / Exclusion Rationale</FieldLabel>
              <Textarea id="feat-rat" rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} />
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {buckets.map((b) => {
          const items = features.filter((f) => f.scopeBucket === b.key);
          return (
            <Card key={b.key}>
              <CardHeader title={`${b.title} (${items.length})`} action={<StatusBadge status={b.key} />} />
              <CardBody className="space-y-3">
                {items.length === 0 ? (
                  <p className="text-xs text-[#64748b]">No features assigned to this bucket.</p>
                ) : (
                  items.map((f) => (
                    <div key={f.id} className="rounded-[8px] border border-[#dce3ee] bg-[#f8fafc] p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#0f172a]">
                          <span className="mr-1.5 font-mono text-[#1d4ed8]">{f.featureKey}</span>
                          {f.name}
                        </span>
                        <div className="flex gap-1.5">
                          <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] border border-[#dce3ee]">{f.effortEstimate}</span>
                          <StatusBadge status={f.priority} />
                        </div>
                      </div>
                      {f.rationale && <p className="mt-1.5 text-[#475569]">{f.rationale}</p>}
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
