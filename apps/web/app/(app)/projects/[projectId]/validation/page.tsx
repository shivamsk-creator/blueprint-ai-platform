"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import type { AIJob, ValidationRun } from "@blueprint/domain";
import {
  Button,
  ErrorState,
  FeedbackBanner,
  JobStatus,
  MetricTile,
  SkeletonBlock,
  ValidationIssueList,
} from "@blueprint/ui";
import { apiFetch, ApiClientError, pollJobUntilComplete } from "@/lib/client-api";

export default function ValidationCenterPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [runs, setRuns] = useState<ValidationRun[]>([]);
  const [activeJob, setActiveJob] = useState<AIJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ runs: ValidationRun[] }>(`/api/projects/${projectId}/validation-runs`);
      setRuns(res.runs);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load validation center.");
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

  const handleRunValidation = async (): Promise<void> => {
    setRunning(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{ run: ValidationRun; job: AIJob }>(
        `/api/projects/${projectId}/validation-runs`,
        { method: "POST", body: JSON.stringify({ includeAiReview: true }) }
      );
      setActiveJob(res.job);
      await pollJobUntilComplete(res.job.id, setActiveJob);
      setFeedback("Validation run completed (deterministic rules + AI consistency review).");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Validation run failed.");
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <SkeletonBlock className="h-80 w-full" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  const latest = runs[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Validation Center</h1>
          <p className="text-sm text-[#64748b]">
            Detects uncovered confirmed requirements, disabled RLS tables, missing auth policies, stale artifacts, and semantic contradictions.
          </p>
        </div>
        <Button loading={running} onClick={() => void handleRunValidation()}>
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Run Full Validation
        </Button>
      </div>

      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}
      {activeJob && <JobStatus job={activeJob} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile label="Blockers" value={latest?.blockerCount ?? 0} accent="crimson" />
        <MetricTile label="High Severity" value={latest?.highCount ?? 0} accent="amber" />
        <MetricTile label="Medium Severity" value={latest?.mediumCount ?? 0} accent="cobalt" />
        <MetricTile label="Total Runs" value={runs.length} accent="emerald" />
      </div>

      <ValidationIssueList issues={latest?.issues ?? []} />
    </div>
  );
}
