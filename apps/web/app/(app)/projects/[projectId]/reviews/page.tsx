"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Approval, Artifact, ArtifactRevision, WorkspaceRole } from "@blueprint/domain";
import { canApprove } from "@blueprint/domain";
import { ApprovalPanel, EmptyState, ErrorState, FeedbackBanner, SkeletonBlock } from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

type ArtifactWithDetails = Artifact & { revisions: ArtifactRevision[]; approvals: Approval[] };

export default function ReviewCenterPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [bundles, setBundles] = useState<ArtifactWithDetails[]>([]);
  const [role, setRole] = useState<WorkspaceRole>("contributor");
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [session, listRes] = await Promise.all([
        apiFetch<{ user: { role: WorkspaceRole } }>("/api/auth/session"),
        apiFetch<{ artifacts: Artifact[] }>(`/api/projects/${projectId}/artifacts`),
      ]);
      setRole(session.user.role);
      const details = await Promise.all(
        listRes.artifacts
          .filter((a) => Boolean(a.currentRevisionId))
          .map((a) => apiFetch<{ artifact: ArtifactWithDetails }>(`/api/artifacts/${a.id}`).then((r) => r.artifact))
      );
      setBundles(details);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load review center.");
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

  const handleDecide = async (payload: {
    revisionId: string;
    decision: Approval["decision"];
    comment: string;
  }): Promise<void> => {
    setSubmittingId(payload.revisionId);
    setFeedback(null);
    try {
      await apiFetch(`/api/artifact-revisions/${payload.revisionId}/approve`, {
        method: "POST",
        body: JSON.stringify({ decision: payload.decision, comment: payload.comment }),
      });
      setFeedback({ tone: "success", message: `Recorded "${payload.decision}" decision and logged to immutable audit trail.` });
      await load();
    } catch (err) {
      setFeedback({ tone: "error", message: err instanceof ApiClientError ? err.message : "Decision failed." });
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) return <SkeletonBlock className="h-80 w-full" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Review & Approval Center</h1>
        <p className="text-sm text-[#64748b]">
          Approve exact immutable artifact revisions. Subsequent revisions never inherit prior approvals automatically.
        </p>
      </div>
      {feedback && <FeedbackBanner tone={feedback.tone} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {bundles.length === 0 ? (
        <EmptyState title="No artifact revisions ready for review" description="Create or generate a BRD/PRD revision first." />
      ) : (
        <div className="space-y-4">
          {bundles.map((art) => {
            const rev = art.currentRevision ?? art.revisions[0];
            if (!rev) return null;
            return (
              <ApprovalPanel
                key={art.id}
                artifactTitle={art.title}
                revision={rev}
                approvals={art.approvals}
                canApprove={canApprove(role)}
                submitting={submittingId === rev.id}
                onDecide={handleDecide}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
