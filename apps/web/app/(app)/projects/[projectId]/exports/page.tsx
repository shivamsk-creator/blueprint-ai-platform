"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download } from "lucide-react";
import { EXPORT_FORMATS, type AIJob, type Artifact, type ExportFile, type ExportFormat } from "@blueprint/domain";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  ErrorState,
  FeedbackBanner,
  FieldLabel,
  JobStatus,
  Select,
  StatusBadge,
} from "@blueprint/ui";
import { apiFetch, ApiClientError, pollJobUntilComplete } from "@/lib/client-api";

export default function ExportCenterPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [exportsList, setExportsList] = useState<ExportFile[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [selectedRevisionIds, setSelectedRevisionIds] = useState<string[]>([]);
  const [activeJob, setActiveJob] = useState<AIJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [expRes, artRes] = await Promise.all([
        apiFetch<{ exports: ExportFile[] }>(`/api/projects/${projectId}/exports`),
        apiFetch<{ artifacts: Artifact[] }>(`/api/projects/${projectId}/artifacts`),
      ]);
      setExportsList(expRes.exports);
      setArtifacts(artRes.artifacts.filter((a) => Boolean(a.currentRevisionId)));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load export center.");
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

  const toggleRev = (revId: string): void => {
    setSelectedRevisionIds((prev) =>
      prev.includes(revId) ? prev.filter((id) => id !== revId) : [...prev, revId]
    );
  };

  const handleExport = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{ exportFile: ExportFile; job: AIJob }>(
        `/api/projects/${projectId}/exports`,
        {
          method: "POST",
          body: JSON.stringify({
            format,
            artifactRevisionIds: selectedRevisionIds,
            includeTraceability: true,
          }),
        }
      );
      setActiveJob(res.job);
      const finished = await pollJobUntilComplete(res.job.id, setActiveJob);
      if (finished.status === "succeeded") {
        setFeedback(`Export ready (${format.toUpperCase()}) — download via private tenant-authenticated link below.`);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Export failed.");
    } finally {
      setGenerating(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Export Center</h1>
        <p className="text-sm text-[#64748b]">
          Asynchronously render exact selected immutable revisions to PDF, DOCX, Markdown, JSON, PostgreSQL SQL, or OpenAPI 3.1 YAML.
        </p>
      </div>
      {feedback && <FeedbackBanner tone="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      <Card>
        <CardHeader title="Generate Blueprint Deliverable" subtitle="Processed asynchronously by the worker into private tenant storage." />
        <CardBody className="space-y-4">
          <form onSubmit={handleExport} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-4">
                <FieldLabel htmlFor="exp-format">Output Format</FieldLabel>
                <Select id="exp-format" value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
                  {EXPORT_FORMATS.map((fmt) => (
                    <option key={fmt} value={fmt}>{fmt.toUpperCase()}</option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-8">
                <FieldLabel>Pin Specific Revisions (optional — defaults to all current revisions)</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {artifacts.map((art) => {
                    const rev = art.currentRevision;
                    if (!rev) return null;
                    const checked = selectedRevisionIds.includes(rev.id);
                    return (
                      <label
                        key={art.id}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ${
                          checked
                            ? "border-[#1d4ed8] bg-[#eff6ff] text-[#1d4ed8]"
                            : "border-[#dce3ee] bg-white text-[#334155]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => toggleRev(rev.id)}
                        />
                        {art.artifactType.toUpperCase()} v{rev.versionNo}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={generating}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Enqueue {format.toUpperCase()} Export
              </Button>
            </div>
          </form>
          {activeJob && <JobStatus job={activeJob} />}
        </CardBody>
      </Card>

      <DataTable
        loading={loading}
        rows={exportsList}
        getRowKey={(e) => e.id}
        emptyTitle="No exports generated yet"
        emptyDescription="Select an output format above to render your first blueprint deliverable."
        columns={[
          { key: "file", header: "File Name", render: (e) => <span className="font-mono text-xs font-semibold">{e.fileName}</span> },
          { key: "fmt", header: "Format", render: (e) => <StatusBadge status="info" label={e.format.toUpperCase()} /> },
          { key: "status", header: "Status", render: (e) => <StatusBadge status={e.status} /> },
          {
            key: "size",
            header: "Size",
            align: "right",
            render: (e) => <span className="font-mono text-xs text-[#64748b]">{e.sizeBytes ? `${(e.sizeBytes / 1024).toFixed(1)} KB` : "—"}</span>,
          },
          {
            key: "action",
            header: "Download",
            align: "right",
            render: (e) =>
              e.status === "succeeded" ? (
                <a
                  href={`/api/exports/${e.id}/download`}
                  className="inline-flex items-center gap-1 rounded-[6px] border border-[#1d4ed8] bg-[#eff6ff] px-2.5 py-1 text-xs font-semibold text-[#1d4ed8] hover:bg-[#dbeafe]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              ) : (
                <span className="text-xs text-[#94a3b8]">Pending</span>
              ),
          },
        ]}
      />
    </div>
  );
}
