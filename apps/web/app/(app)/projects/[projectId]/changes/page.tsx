"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ChangeRequest, Requirement } from "@blueprint/domain";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
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

export default function ChangeRequestsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [sourceReqId, setSourceReqId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [crRes, reqRes] = await Promise.all([
        apiFetch<{ changes: ChangeRequest[] }>(`/api/projects/${projectId}/changes`),
        apiFetch<{ requirements: Requirement[] }>(`/api/projects/${projectId}/requirements`),
      ]);
      setChanges(crRes.changes);
      setRequirements(reqRes.requirements);
      setSourceReqId((prev) => prev || reqRes.requirements[0]?.id || "");
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load change requests.");
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

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setFeedback(null);
    try {
      const { changeRequest } = await apiFetch<{ changeRequest: ChangeRequest }>(
        `/api/projects/${projectId}/changes`,
        {
          method: "POST",
          body: JSON.stringify({
            title,
            description,
            reason,
            sourceEntityType: sourceReqId ? "requirement" : undefined,
            sourceEntityId: sourceReqId || undefined,
          }),
        }
      );
      setChanges((prev) => [changeRequest, ...prev]);
      setTitle("");
      setDescription("");
      setReason("");
      setFeedback({
        tone: "success",
        message: `Created ${changeRequest.changeKey} with ${changeRequest.impacts.length} downstream impact(s) detected.`,
      });
    } catch (err) {
      setFeedback({ tone: "error", message: err instanceof ApiClientError ? err.message : "Failed to create CR." });
    }
  };

  if (loading) return <SkeletonBlock className="h-72 w-full" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Controlled Change Requests & Impact Analysis</h1>
        <p className="text-sm text-[#64748b]">Propose requirement modifications and automatically traverse traceability links to surface downstream impacts (Manager+ role).</p>
      </div>
      {feedback && <FeedbackBanner tone={feedback.tone} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <Card>
        <CardHeader title="Propose Change Request" />
        <CardBody>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="cr-title" required>Change Title</FieldLabel>
              <Input id="cr-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Lower dual-approval threshold to $10,000" />
            </div>
            <div>
              <FieldLabel htmlFor="cr-req">Impacted Requirement (optional)</FieldLabel>
              <Select id="cr-req" value={sourceReqId} onChange={(e) => setSourceReqId(e.target.value)}>
                <option value="">None</option>
                {requirements.map((r) => (
                  <option key={r.id} value={r.id}>{r.requirementKey} — {r.title}</option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="cr-desc" required>Description</FieldLabel>
              <Textarea id="cr-desc" rows={2} required value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="cr-reason">Business Justification</FieldLabel>
              <Input id="cr-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">Submit & Analyze Downstream Impact</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {changes.length === 0 ? (
        <EmptyState title="No change requests submitted" description="Create a controlled change request above to inspect downstream feature, task, and QA impacts." />
      ) : (
        <div className="space-y-4">
          {changes.map((cr) => (
            <Card key={cr.id}>
              <CardHeader
                title={<span className="flex items-center gap-2"><span className="font-mono text-[#1d4ed8]">{cr.changeKey}</span>{cr.title}</span>}
                subtitle={cr.description}
                action={<StatusBadge status={cr.status} />}
              />
              <CardBody className="space-y-2 text-xs">
                <div className="font-semibold text-[#64748b]">Detected Downstream Impacts ({cr.impacts.length})</div>
                {cr.impacts.length === 0 ? (
                  <p className="text-[#64748b]">No linked downstream entities impacted.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {cr.impacts.map((imp) => (
                      <li key={imp.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#dce3ee] bg-[#f8fafc] px-3 py-2">
                        <span className="font-mono font-semibold text-[#0f172a]">
                          {imp.affectedEntityType}:{imp.affectedEntityId.slice(0, 8)}
                        </span>
                        <span className="text-[#475569]">{imp.rationale}</span>
                        <StatusBadge status={imp.impactSeverity} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
