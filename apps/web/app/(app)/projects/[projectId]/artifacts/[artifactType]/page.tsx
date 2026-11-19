"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ARTIFACT_META,
  type AIJob,
  type AIModel,
  type AITaskPolicy,
  type Approval,
  type Artifact,
  type ArtifactRevision,
  type ArtifactType,
  type RevisionDiffResult,
} from "@blueprint/domain";
import {
  AITaskPanel,
  ArtifactEditor,
  ErrorState,
  FeedbackBanner,
  SkeletonBlock,
  VersionDiff,
} from "@blueprint/ui";
import { apiFetch, ApiClientError, pollJobUntilComplete } from "@/lib/client-api";

type ArtifactBundle = Artifact & { revisions: ArtifactRevision[]; approvals: Approval[] };

export default function UnifiedArtifactEditorPage() {
  const { projectId, artifactType } = useParams<{ projectId: string; artifactType: ArtifactType }>();
  const [artifact, setArtifact] = useState<ArtifactBundle | null>(null);
  const [models, setModels] = useState<AIModel[]>([]);
  const [policies, setPolicies] = useState<AITaskPolicy[]>([]);
  const [activeJob, setActiveJob] = useState<AIJob | null>(null);
  const [activeDiff, setActiveDiff] = useState<{ revision: ArtifactRevision; diff: RevisionDiffResult } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningAi, setRunningAi] = useState(false);
  const [regenSection, setRegenSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [listRes, modelRes] = await Promise.all([
        apiFetch<{ artifacts: Artifact[] }>(`/api/projects/${projectId}/artifacts`),
        apiFetch<{ models: AIModel[]; policies: AITaskPolicy[] }>("/api/settings/ai-models"),
      ]);
      const match = listRes.artifacts.find((a) => a.artifactType === artifactType);
      if (!match) {
        setError(`Artifact type "${artifactType}" not found in project.`);
        return;
      }
      const detail = await apiFetch<{ artifact: ArtifactBundle }>(`/api/artifacts/${match.id}`);
      setArtifact(detail.artifact);
      setModels(modelRes.models);
      setPolicies(modelRes.policies);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load artifact.");
    } finally {
      setLoading(false);
    }
  }, [projectId, artifactType]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleSaveRevision = async (payload: {
    sections: ArtifactRevision["content"]["sections"];
    changeSummary: string;
    status: ArtifactRevision["status"];
    baseRevisionId?: string;
  }): Promise<void> => {
    if (!artifact) return;
    setSaving(true);
    try {
      const { revision } = await apiFetch<{ revision: ArtifactRevision }>(
        `/api/artifacts/${artifact.id}/revisions`,
        { method: "POST", body: JSON.stringify(payload) }
      );
      setFeedback(`Saved immutable revision v${revision.versionNo} (${revision.status}).`);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async (params: { instructions: string; modelOverrideId?: string }): Promise<void> => {
    if (!artifact) return;
    setRunningAi(true);
    setAiError(null);
    try {
      const { job } = await apiFetch<{ job: AIJob }>(`/api/artifacts/${artifact.id}/generate`, {
        method: "POST",
        body: JSON.stringify(params),
      });
      setActiveJob(job);
      const done = await pollJobUntilComplete(job.id, setActiveJob);
      if (done.status === "succeeded") {
        setFeedback("AI candidate revision created without overwriting your active revision. Use Diff to review & accept.");
        await load();
      }
    } catch (err) {
      setAiError(err instanceof ApiClientError ? err.message : "Generation failed.");
    } finally {
      setRunningAi(false);
    }
  };

  const handleRegenerateSection = async (payload: {
    baseRevisionId: string;
    sectionKey: string;
    instructions: string;
  }): Promise<void> => {
    if (!artifact) return;
    setRegenSection(payload.sectionKey);
    try {
      const { job } = await apiFetch<{ job: AIJob }>(
        `/api/artifacts/${artifact.id}/regenerate-section`,
        { method: "POST", body: JSON.stringify(payload) }
      );
      setActiveJob(job);
      const done = await pollJobUntilComplete(job.id, setActiveJob);
      await load();
      const candId = done.resultPayload?.candidateRevisionId as string | undefined;
      if (candId) {
        await handleInspectDiff(candId);
      }
    } finally {
      setRegenSection(null);
    }
  };

  const handleInspectDiff = async (revisionId: string): Promise<void> => {
    const { diff } = await apiFetch<{ diff: RevisionDiffResult }>(
      `/api/artifact-revisions/${revisionId}/diff`
    );
    const rev = artifact?.revisions.find((r) => r.id === revisionId);
    if (rev) setActiveDiff({ revision: rev, diff });
  };

  if (loading) return <SkeletonBlock className="h-96 w-full" />;
  if (error || !artifact) return <ErrorState message={error ?? "Artifact not found."} onRetry={() => void load()} />;

  const meta = ARTIFACT_META[artifact.artifactType];

  return (
    <div className="space-y-6">
      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      <ArtifactEditor
        artifact={artifact}
        revisions={artifact.revisions}
        saving={saving}
        regeneratingSection={regenSection}
        onSaveRevision={handleSaveRevision}
        onRegenerateSection={handleRegenerateSection}
        onInspectDiff={handleInspectDiff}
      />

      {activeDiff && (
        <VersionDiff
          diff={activeDiff.diff}
          onRejectCandidate={() => setActiveDiff(null)}
          onAcceptCandidate={async () => {
            await handleSaveRevision({
              sections: activeDiff.revision.content.sections,
              changeSummary: `Accepted candidate v${activeDiff.revision.versionNo}`,
              status: "draft",
              baseRevisionId: artifact.currentRevisionId ?? undefined,
            });
            setActiveDiff(null);
          }}
        />
      )}

      <AITaskPanel
        title={`Generate ${meta.shortTitle} Candidate Revision`}
        description="Synthesizes structured sections anchored to confirmed project requirements and decisions."
        taskType={meta.taskType}
        models={models}
        policy={policies.find((p) => p.taskType === meta.taskType)}
        activeJob={activeJob}
        running={runningAi}
        error={aiError}
        ctaLabel={`Generate ${meta.shortTitle} Candidate`}
        onExecute={handleGenerate}
      />
    </div>
  );
}
