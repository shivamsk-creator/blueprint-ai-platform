"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ArchitectureComponent, ArchitectureDecision, ArchitectureRelationship } from "@blueprint/domain";
import {
  ArchitectureCanvas,
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
} from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function ArchitectureWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [components, setComponents] = useState<ArchitectureComponent[]>([]);
  const [relationships, setRelationships] = useState<ArchitectureRelationship[]>([]);
  const [decisions, setDecisions] = useState<ArchitectureDecision[]>([]);
  const [name, setName] = useState("");
  const [layer, setLayer] = useState<ArchitectureComponent["layer"]>("application");
  const [technology, setTechnology] = useState("");
  const [responsibility, setResponsibility] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{
        components: ArchitectureComponent[];
        relationships: ArchitectureRelationship[];
        decisions: ArchitectureDecision[];
      }>(`/api/projects/${projectId}/architecture/components`);
      setComponents(res.components);
      setRelationships(res.relationships);
      setDecisions(res.decisions);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load architecture.");
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
    const { component } = await apiFetch<{ component: ArchitectureComponent }>(
      `/api/projects/${projectId}/architecture/components`,
      { method: "POST", body: JSON.stringify({ name, layer, technology, responsibility }) }
    );
    setComponents((prev) => [...prev, component]);
    setName("");
    setTechnology("");
    setResponsibility("");
    setFeedback(`Added component ${component.componentKey}.`);
  };

  if (loading) return <SkeletonBlock className="h-80 w-full" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Architecture Workspace</h1>
        <p className="text-sm text-[#64748b]">Structured, editable component topology, protocol flows, and Architecture Decision Records (ADRs).</p>
      </div>
      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      <ArchitectureCanvas components={components} relationships={relationships} />

      <Card>
        <CardHeader title="Add Architecture Component" />
        <CardBody>
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-3">
              <FieldLabel htmlFor="arch-name" required>Component Name</FieldLabel>
              <Input id="arch-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="arch-layer">Layer</FieldLabel>
              <Select id="arch-layer" value={layer} onChange={(e) => setLayer(e.target.value as ArchitectureComponent["layer"])}>
                <option value="client">Client</option>
                <option value="edge">Edge</option>
                <option value="application">Application</option>
                <option value="worker">Worker</option>
                <option value="data">Data</option>
                <option value="external">External</option>
              </Select>
            </div>
            <div className="md:col-span-3">
              <FieldLabel htmlFor="arch-tech">Technology</FieldLabel>
              <Input id="arch-tech" value={technology} onChange={(e) => setTechnology(e.target.value)} placeholder="e.g., Redis / Supabase Storage" />
            </div>
            <div className="md:col-span-3">
              <FieldLabel htmlFor="arch-resp">Responsibility</FieldLabel>
              <Input id="arch-resp" value={responsibility} onChange={(e) => setResponsibility(e.target.value)} />
            </div>
            <div className="flex items-end md:col-span-1">
              <Button type="submit" className="w-full">Add</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {decisions.length > 0 && (
        <Card>
          <CardHeader title="Architecture Decision Records (ADRs)" />
          <CardBody className="space-y-3 text-xs">
            {decisions.map((adr) => (
              <div key={adr.id} className="rounded-[8px] border border-[#dce3ee] bg-[#f8fafc] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#0f172a]">
                    <span className="mr-2 font-mono text-[#1d4ed8]">{adr.adrKey}</span>
                    {adr.title}
                  </span>
                  <StatusBadge status={adr.status} />
                </div>
                <p className="mt-1.5 text-[#334155]"><strong>Decision:</strong> {adr.decision}</p>
                <p className="mt-1 text-[#64748b]"><strong>Consequences:</strong> {adr.consequences}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
