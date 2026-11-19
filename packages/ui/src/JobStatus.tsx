"use client";

import React from "react";
import { Loader2, XCircle, CheckCircle2, Clock, Ban } from "lucide-react";
import type { AIJob } from "@blueprint/domain";
import { Button } from "./primitives";
import { StatusBadge } from "./StatusBadge";

export function JobStatus({
  job,
  onCancel,
  cancelling = false,
}: {
  job: AIJob;
  onCancel?: (jobId: string) => void;
  cancelling?: boolean;
}) {
  const isActive = job.status === "queued" || job.status === "running";
  const latestEvent = job.events?.[job.events.length - 1];

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-[10px] border border-[#dce3ee] bg-[#f8fafc] p-3.5 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {job.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-[#1d4ed8]" />}
          {job.status === "queued" && <Clock className="h-4 w-4 text-[#64748b]" />}
          {job.status === "succeeded" && <CheckCircle2 className="h-4 w-4 text-[#047857]" />}
          {job.status === "failed" && <XCircle className="h-4 w-4 text-[#be123c]" />}
          {job.status === "cancelled" && <Ban className="h-4 w-4 text-[#64748b]" />}
          <span className="font-mono font-semibold text-[#0f172a]">{job.jobType}</span>
          <StatusBadge status={job.status} />
          {job.resolvedModelId && (
            <span className="rounded bg-white px-2 py-0.5 font-mono text-[11px] text-[#334155] border border-[#dce3ee]">
              {job.resolvedModelId}
              {job.wasUserOverride ? " · override" : " · default"}
            </span>
          )}
        </div>
        {isActive && onCancel && (
          <Button size="sm" variant="outline" loading={cancelling} onClick={() => onCancel(job.id)}>
            Cancel job
          </Button>
        )}
      </div>

      {latestEvent && (
        <p className="mt-2 text-[#475569]">{latestEvent.message}</p>
      )}
      {job.errorMessage && (
        <p className="mt-2 rounded border border-[#fecdd3] bg-[#fff1f2] px-2.5 py-1.5 text-[#be123c]">
          {job.errorMessage}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] text-[#64748b]">
        <span>Job ID: {job.id.slice(0, 8)}</span>
        <span className="bp-tabular">Attempts: {job.attemptCount}/{job.maxAttempts}</span>
      </div>
    </div>
  );
}
