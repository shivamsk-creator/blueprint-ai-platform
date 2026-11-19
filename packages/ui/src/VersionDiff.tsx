"use client";

import React from "react";
import { Check, X } from "lucide-react";
import type { RevisionDiffResult } from "@blueprint/domain";
import { Button, Card, CardBody, CardHeader } from "./primitives";
import { StatusBadge } from "./StatusBadge";

export function VersionDiff({
  diff,
  onAcceptCandidate,
  onRejectCandidate,
  accepting = false,
}: {
  diff: RevisionDiffResult;
  onAcceptCandidate?: () => void;
  onRejectCandidate?: () => void;
  accepting?: boolean;
}) {
  return (
    <Card>
      <CardHeader
        title="Revision Comparison Diff"
        subtitle={`Added: ${diff.summary.added} · Modified: ${diff.summary.modified} · Removed: ${diff.summary.removed} · Unchanged: ${diff.summary.unchanged}`}
        action={
          (onAcceptCandidate || onRejectCandidate) && (
            <div className="flex gap-2">
              {onRejectCandidate && (
                <Button size="sm" variant="outline" onClick={onRejectCandidate}>
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Dismiss
                </Button>
              )}
              {onAcceptCandidate && (
                <Button size="sm" loading={accepting} onClick={onAcceptCandidate}>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Accept as New Current Revision
                </Button>
              )}
            </div>
          )
        }
      />
      <CardBody className="space-y-4">
        {diff.sections.map((sec) => (
          <div key={sec.sectionKey} className="overflow-hidden rounded-[10px] border border-[#dce3ee]">
            <div className="flex items-center justify-between bg-[#f8fafc] px-4 py-2.5 text-xs">
              <span className="font-semibold text-[#0f172a]">{sec.heading}</span>
              <div className="flex items-center gap-2">
                {sec.addedLines > 0 && (
                  <span className="bp-tabular font-mono font-semibold text-[#047857]">+{sec.addedLines}</span>
                )}
                {sec.removedLines > 0 && (
                  <span className="bp-tabular font-mono font-semibold text-[#be123c]">-{sec.removedLines}</span>
                )}
                <StatusBadge
                  status={sec.status}
                  tone={
                    sec.status === "added"
                      ? "success"
                      : sec.status === "removed"
                      ? "danger"
                      : sec.status === "modified"
                      ? "info"
                      : "neutral"
                  }
                />
              </div>
            </div>
            {sec.status !== "unchanged" && (
              <div className="grid grid-cols-1 divide-y divide-[#e2e8f0] md:grid-cols-2 md:divide-x md:divide-y-0">
                <div className="bg-[#fff1f2]/35 p-3">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#9f1239]">
                    Previous Revision
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-xs text-[#334155]">
                    {sec.beforeMarkdown || "(Section did not exist)"}
                  </pre>
                </div>
                <div className="bg-[#ecfdf5]/35 p-3">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#065f46]">
                    Candidate / Target Revision
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-xs text-[#0f172a]">
                    {sec.afterMarkdown || "(Section removed)"}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
