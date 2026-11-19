"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Requirement } from "@blueprint/domain";
import { Button, Card, CardBody, CardHeader, ErrorState, FeedbackBanner, SkeletonBlock, StatusBadge } from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function RequirementDetailPage() {
  const { projectId, requirementId } = useParams<{ projectId: string; requirementId: string }>();
  const [req, setReq] = useState<Requirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ requirement: Requirement }>(`/api/requirements/${requirementId}`);
      setReq(res.requirement);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load requirement.");
    } finally {
      setLoading(false);
    }
  }, [requirementId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const setStatus = async (status: Requirement["status"]): Promise<void> => {
    setUpdating(true);
    try {
      const res = await apiFetch<{ requirement: Requirement; flaggedArtifactIds: string[] }>(
        `/api/requirements/${requirementId}`,
        { method: "PATCH", body: JSON.stringify({ status, changeSummary: `Transitioned status to ${status}` }) }
      );
      setReq(res.requirement);
      setFeedback(`Status updated to "${status}" (v${res.requirement.currentVersion}).`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <SkeletonBlock className="h-64 w-full" />;
  if (error || !req) return <ErrorState message={error ?? "Requirement not found."} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-[#1d4ed8]">{req.requirementKey}</span>
            <StatusBadge status={req.status} />
            <StatusBadge status={req.priority} />
            <span className="font-mono text-xs text-[#64748b]">v{req.currentVersion}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0f172a]">{req.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" loading={updating} onClick={() => void setStatus("confirmed")}>Confirm Requirement</Button>
          <Button size="sm" variant="outline" loading={updating} onClick={() => void setStatus("deferred")}>Defer</Button>
          <Link href={`/projects/${projectId}/knowledge`}>
            <Button size="sm" variant="ghost">Back to Knowledge Repo</Button>
          </Link>
        </div>
      </div>

      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      <Card>
        <CardHeader title="Specification & Acceptance Criteria" subtitle={`Type: ${req.requirementType} · Source: ${req.sourceType}`} />
        <CardBody className="space-y-4 text-sm">
          <p className="leading-relaxed text-[#334155]">{req.description}</p>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">Acceptance Criteria</h3>
            {req.acceptanceCriteria.length === 0 ? (
              <p className="mt-1 text-xs text-[#64748b]">No acceptance criteria defined yet.</p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[#0f172a]">
                {req.acceptanceCriteria.map((ac, idx) => (
                  <li key={idx}>{ac}</li>
                ))}
              </ul>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Immutable Requirement Revision History" />
        <CardBody className="space-y-2 text-xs">
          {(req.revisions ?? []).map((rev) => (
            <div key={rev.id} className="rounded-[8px] border border-[#dce3ee] bg-[#f8fafc] p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#0f172a]">v{rev.versionNo}</span>
                <span className="font-mono text-[#64748b]">{new Date(rev.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-[#475569]">{rev.changeSummary}</p>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
