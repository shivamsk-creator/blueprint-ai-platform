"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Assumption, Constraint, Requirement, ResearchEvidence, ResearchSource } from "@blueprint/domain";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  ErrorState,
  FeedbackBanner,
  FieldLabel,
  Input,
  RequirementDrawer,
  Select,
  StatusBadge,
  Textarea,
} from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function KnowledgeRepositoryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [evidence, setEvidence] = useState<ResearchEvidence[]>([]);
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New requirement form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reqType, setReqType] = useState<Requirement["requirementType"]>("functional");
  const [priority, setPriority] = useState<Requirement["priority"]>("high");

  const load = useCallback(async () => {
    try {
      const [reqRes, knowRes] = await Promise.all([
        apiFetch<{ requirements: Requirement[] }>(`/api/projects/${projectId}/requirements`),
        apiFetch<{
          assumptions: Assumption[];
          constraints: Constraint[];
          researchSources: ResearchSource[];
          researchEvidence: ResearchEvidence[];
        }>(`/api/projects/${projectId}/knowledge`),
      ]);
      setRequirements(reqRes.requirements);
      setAssumptions(knowRes.assumptions);
      setConstraints(knowRes.constraints);
      setSources(knowRes.researchSources);
      setEvidence(knowRes.researchEvidence);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load knowledge repository.");
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

  const handleCreateReq = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const { requirement } = await apiFetch<{ requirement: Requirement }>(
      `/api/projects/${projectId}/requirements`,
      {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          requirementType: reqType,
          priority,
          status: "proposed",
          acceptanceCriteria: [],
          sourceType: "manual",
        }),
      }
    );
    setRequirements((prev) => [...prev, requirement]);
    setTitle("");
    setDescription("");
    setFeedback(`Created ${requirement.requirementKey} (${requirement.status}).`);
  };

  const handleSaveDrawer = async (
    reqId: string,
    updates: {
      title: string;
      description: string;
      priority: Requirement["priority"];
      status: Requirement["status"];
      acceptanceCriteria: string[];
      changeSummary: string;
    }
  ): Promise<void> => {
    setSaving(true);
    try {
      const res = await apiFetch<{ requirement: Requirement; flaggedArtifactIds: string[] }>(
        `/api/requirements/${reqId}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      setRequirements((prev) => prev.map((r) => (r.id === reqId ? res.requirement : r)));
      setSelectedReq(res.requirement);
      setFeedback(
        res.flaggedArtifactIds.length > 0
          ? `Saved ${res.requirement.requirementKey} v${res.requirement.currentVersion}. Flagged ${res.flaggedArtifactIds.length} linked artifact(s) for impact review.`
          : `Saved ${res.requirement.requirementKey} v${res.requirement.currentVersion}.`
      );
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Knowledge Repository</h1>
        <p className="text-sm text-[#64748b]">
          Canonical requirements (with immutable revision history), assumptions, constraints, and cited research provenance.
        </p>
      </div>
      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      <Card>
        <CardHeader title="Add Canonical Requirement" />
        <CardBody>
          <form onSubmit={handleCreateReq} className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <FieldLabel htmlFor="req-title" required>Requirement Title</FieldLabel>
              <Input id="req-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Export signed PDF bundle" />
            </div>
            <div className="md:col-span-3">
              <FieldLabel htmlFor="req-type">Type</FieldLabel>
              <Select id="req-type" value={reqType} onChange={(e) => setReqType(e.target.value as Requirement["requirementType"])}>
                <option value="functional">Functional</option>
                <option value="non_functional">Non-Functional</option>
                <option value="business">Business</option>
                <option value="technical">Technical</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="req-pri">Priority</FieldLabel>
              <Select id="req-pri" value={priority} onChange={(e) => setPriority(e.target.value as Requirement["priority"])}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </div>
            <div className="flex items-end md:col-span-2">
              <Button type="submit" className="w-full">Add</Button>
            </div>
            <div className="md:col-span-12">
              <FieldLabel htmlFor="req-desc" required>Description</FieldLabel>
              <Textarea id="req-desc" rows={2} required value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </form>
        </CardBody>
      </Card>

      <DataTable
        loading={loading}
        rows={requirements}
        getRowKey={(r) => r.id}
        searchPlaceholder="Search requirements by ID, title, or description..."
        searchFilter={(r, q) =>
          r.requirementKey.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
        }
        onRowClick={(r) => setSelectedReq(r)}
        columns={[
          {
            key: "key",
            header: "ID",
            sortable: true,
            sortValue: (r) => r.requirementKey,
            render: (r) => (
              <Link
                href={`/projects/${projectId}/requirements/${r.id}`}
                onClick={(e) => e.stopPropagation()}
                className="font-mono text-xs font-bold text-[#1d4ed8] hover:underline"
              >
                {r.requirementKey}
              </Link>
            ),
          },
          { key: "title", header: "Requirement", render: (r) => <span className="font-medium">{r.title}</span> },
          { key: "type", header: "Type", render: (r) => <span className="text-xs capitalize text-[#475569]">{r.requirementType.replace("_", " ")}</span> },
          { key: "priority", header: "Priority", render: (r) => <StatusBadge status={r.priority} /> },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          { key: "ver", header: "Rev", align: "right", render: (r) => <span className="font-mono text-xs">v{r.currentVersion}</span> },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title={`Assumptions (${assumptions.length})`} />
          <CardBody className="space-y-2.5 text-xs">
            {assumptions.map((a) => (
              <div key={a.id} className="rounded-[8px] border border-[#dce3ee] bg-[#f8fafc] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#1d4ed8]">{a.assumptionKey}</span>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-1 text-[#0f172a]">{a.statement}</p>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={`Constraints (${constraints.length})`} />
          <CardBody className="space-y-2.5 text-xs">
            {constraints.map((c) => (
              <div key={c.id} className="rounded-[8px] border border-[#dce3ee] bg-[#f8fafc] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#1d4ed8]">{c.constraintKey}</span>
                  <StatusBadge status={c.severity} />
                </div>
                <div className="mt-1 font-semibold text-[#0f172a]">{c.title}</div>
                <p className="mt-0.5 text-[#475569]">{c.description}</p>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={`Research Provenance (${sources.length})`} />
          <CardBody className="space-y-2.5 text-xs">
            {sources.map((s) => {
              const evs = evidence.filter((e) => e.sourceId === s.id);
              return (
                <div key={s.id} className="rounded-[8px] border border-[#dce3ee] bg-[#f8fafc] p-3">
                  <div className="font-semibold text-[#0f172a]">{s.title}</div>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noreferrer" className="mt-0.5 block truncate font-mono text-[11px] text-[#1d4ed8] hover:underline">
                      {s.url}
                    </a>
                  )}
                  {evs.map((e) => (
                    <blockquote key={e.id} className="mt-2 border-l-2 border-[#1d4ed8] pl-2 italic text-[#475569]">
                      &ldquo;{e.excerpt}&rdquo;
                    </blockquote>
                  ))}
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      <RequirementDrawer
        requirement={selectedReq}
        saving={saving}
        onClose={() => setSelectedReq(null)}
        onSave={handleSaveDrawer}
      />
    </div>
  );
}
