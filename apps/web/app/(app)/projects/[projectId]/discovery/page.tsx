"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { AIJob, AIModel, AITaskPolicy, DiscoverySession, ProjectFile } from "@blueprint/domain";
import {
  AITaskPanel,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  FeedbackBanner,
  FieldLabel,
  FileUploader,
  Input,
  SkeletonBlock,
  StatusBadge,
  Textarea,
} from "@blueprint/ui";
import { apiFetch, ApiClientError, pollJobUntilComplete } from "@/lib/client-api";

export default function ProjectDiscoveryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [sessions, setSessions] = useState<DiscoverySession[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [policies, setPolicies] = useState<AITaskPolicy[]>([]);
  const [title, setTitle] = useState("");
  const [briefSnapshot, setBriefSnapshot] = useState("");
  const [activeJob, setActiveJob] = useState<AIJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [runningAi, setRunningAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [sessRes, fileRes, modelRes] = await Promise.all([
        apiFetch<{ sessions: DiscoverySession[] }>(`/api/projects/${projectId}/discovery/sessions`),
        apiFetch<{ files: ProjectFile[] }>(`/api/projects/${projectId}/files`),
        apiFetch<{ models: AIModel[]; policies: AITaskPolicy[] }>("/api/settings/ai-models"),
      ]);
      setSessions(sessRes.sessions);
      setFiles(fileRes.files);
      setModels(modelRes.models);
      setPolicies(modelRes.policies);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load discovery workspace.");
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

  const handleCreateSession = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const { session } = await apiFetch<{ session: DiscoverySession }>(
      `/api/projects/${projectId}/discovery/sessions`,
      { method: "POST", body: JSON.stringify({ title, briefSnapshot }) }
    );
    setSessions((prev) => [session, ...prev]);
    setTitle("");
    setBriefSnapshot("");
    setFeedback(`Discovery session "${session.title}" created.`);
  };

  const handleUpload = async (payload: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    extractedText?: string;
  }): Promise<void> => {
    setUploading(true);
    try {
      const { file } = await apiFetch<{ file: ProjectFile }>(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setFiles((prev) => [file, ...prev]);
      setFeedback(`Uploaded "${file.fileName}" to private tenant storage.`);
    } finally {
      setUploading(false);
    }
  };

  const handleRunAnalysis = async (params: { instructions: string; modelOverrideId?: string }): Promise<void> => {
    const targetSession = sessions[0];
    if (!targetSession) {
      setAiError("Create a discovery session first.");
      return;
    }
    setRunningAi(true);
    setAiError(null);
    try {
      const { job } = await apiFetch<{ job: AIJob }>(`/api/projects/${projectId}/discovery/analyze`, {
        method: "POST",
        body: JSON.stringify({
          sessionId: targetSession.id,
          fileIds: files.map((f) => f.id),
          instructions: params.instructions || undefined,
          modelOverrideId: params.modelOverrideId,
        }),
      });
      setActiveJob(job);
      const finished = await pollJobUntilComplete(job.id, setActiveJob);
      if (finished.status === "succeeded") {
        setFeedback("Discovery analysis succeeded — proposed questions and requirements added for review.");
      }
    } catch (err) {
      setAiError(err instanceof ApiClientError ? err.message : "Discovery analysis failed.");
    } finally {
      setRunningAi(false);
    }
  };

  if (loading) return <SkeletonBlock className="h-80 w-full" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Discovery Studio</h1>
          <p className="text-sm text-[#64748b]">
            Capture product briefs, upload private reference files, and run AI gap analysis to propose clarification questions and requirements.
          </p>
        </div>
        <Link href={`/projects/${projectId}/discovery/questions`}>
          <Button variant="outline">Open Clarification Q&A</Button>
        </Link>
      </div>

      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          <Card>
            <CardHeader title="Start Discovery Session" subtitle="Snapshot a brief to anchor AI analysis and provenance." />
            <CardBody>
              <form onSubmit={handleCreateSession} className="space-y-3">
                <div>
                  <FieldLabel htmlFor="disc-title" required>Session Title</FieldLabel>
                  <Input id="disc-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Phase 1 Settlement & Compliance Scope" />
                </div>
                <div>
                  <FieldLabel htmlFor="disc-brief" required>Brief Snapshot</FieldLabel>
                  <Textarea id="disc-brief" rows={4} required value={briefSnapshot} onChange={(e) => setBriefSnapshot(e.target.value)} placeholder="Paste raw stakeholder notes, product vision, or compliance constraints..." />
                </div>
                <Button type="submit">Create Discovery Session</Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Recorded Discovery Sessions" />
            <CardBody className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="rounded-[10px] border border-[#dce3ee] bg-[#f8fafc] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-[#0f172a]">{s.title}</h4>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#475569]">{s.briefSnapshot}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          <FileUploader files={files} uploading={uploading} onUpload={handleUpload} />
        </div>

        <div className="lg:col-span-5">
          <AITaskPanel
            title="AI Discovery Gap Analysis"
            description="Proposes prioritized clarification questions and draft requirements (all marked 'proposed' until confirmed)."
            taskType="requirement_analysis"
            models={models}
            policy={policies.find((p) => p.taskType === "requirement_analysis")}
            activeJob={activeJob}
            running={runningAi}
            error={aiError}
            ctaLabel="Enqueue Discovery Analysis"
            onExecute={handleRunAnalysis}
          />
        </div>
      </div>
    </div>
  );
}
