"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Artifact, ArtifactRevision, RevisionDiffResult } from "@blueprint/domain";
import { Button, Card, CardBody, CardHeader, ErrorState, SkeletonBlock, StatusBadge, VersionDiff } from "@blueprint/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export default function ArtifactVersionHistoryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [items, setItems] = useState<Array<{ artifact: Artifact; revisions: ArtifactRevision[] }>>([]);
  const [selectedDiff, setSelectedDiff] = useState<RevisionDiffResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { artifacts } = await apiFetch<{ artifacts: Artifact[] }>(`/api/projects/${projectId}/artifacts`);
      const rows = await Promise.all(
        artifacts.map(async (art) => {
          const { revisions } = await apiFetch<{ revisions: ArtifactRevision[] }>(`/api/artifacts/${art.id}/revisions`);
          return { artifact: art, revisions };
        })
      );
      setItems(rows.filter((r) => r.revisions.length > 0));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load version history.");
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

  const inspectDiff = async (revisionId: string): Promise<void> => {
    const { diff } = await apiFetch<{ diff: RevisionDiffResult }>(`/api/artifact-revisions/${revisionId}/diff`);
    setSelectedDiff(diff);
  };

  if (loading) return <SkeletonBlock className="h-80 w-full" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Immutable Version History</h1>
        <p className="text-sm text-[#64748b]">Inspect every immutable artifact revision and compare section-level diffs.</p>
      </div>

      {selectedDiff && <VersionDiff diff={selectedDiff} onRejectCandidate={() => setSelectedDiff(null)} />}

      <div className="space-y-4">
        {items.map(({ artifact, revisions }) => (
          <Card key={artifact.id}>
            <CardHeader title={artifact.title} subtitle={`${revisions.length} immutable revision(s)`} />
            <CardBody className="divide-y divide-[#eef2f7]">
              {revisions.map((rev) => (
                <div key={rev.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-[#1d4ed8]">v{rev.versionNo}</span>
                    <StatusBadge status={rev.status} />
                    <span className="rounded bg-[#f1f5f9] px-1.5 py-0.5 font-mono text-[10px] text-[#475569]">{rev.source}</span>
                    <span className="text-[#0f172a]">{rev.changeSummary}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[#64748b]">{new Date(rev.createdAt).toLocaleString()}</span>
                    <Button size="sm" variant="outline" onClick={() => void inspectDiff(rev.id)}>Compare Diff</Button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
