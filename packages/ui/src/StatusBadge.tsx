"use client";

import React from "react";
import { cn } from "./primitives";

export type BadgeTone = "success" | "info" | "warn" | "danger" | "neutral";

const STATUS_TONE_MAP: Record<string, BadgeTone> = {
  approved: "success",
  succeeded: "success",
  confirmed: "success",
  accepted: "success",
  passing: "success",
  done: "success",
  active: "success",
  validated: "success",
  ok: "success",
  mvp: "info",
  in_review: "info",
  ready_for_review: "info",
  running: "info",
  in_progress: "info",
  impact_review: "info",
  ready: "info",
  submitted: "info",
  needs_input: "warn",
  deferred: "warn",
  proposed: "warn",
  changes_requested: "warn",
  high: "warn",
  medium: "warn",
  phase_2: "warn",
  blocked: "danger",
  rejected: "danger",
  failed: "danger",
  failing: "danger",
  blocker: "danger",
  critical: "danger",
  invalidated: "danger",
  error: "danger",
  excluded: "neutral",
  draft: "neutral",
  not_started: "neutral",
  queued: "neutral",
  cancelled: "neutral",
  superseded: "neutral",
  archived: "neutral",
  open: "neutral",
  low: "neutral",
  info: "neutral",
};

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]",
  info: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
  warn: "bg-[#fffbeb] text-[#b45309] border-[#fde68a]",
  danger: "bg-[#fff1f2] text-[#be123c] border-[#fecdd3]",
  neutral: "bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]",
};

export function StatusBadge({
  status,
  label,
  tone,
  className,
}: {
  status: string;
  label?: string;
  tone?: BadgeTone;
  className?: string;
}) {
  const resolvedTone = tone ?? STATUS_TONE_MAP[status.toLowerCase()] ?? "neutral";
  const text = label ?? status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize tracking-wide whitespace-nowrap",
        TONE_CLASSES[resolvedTone],
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          resolvedTone === "success" && "bg-[#047857]",
          resolvedTone === "info" && "bg-[#1d4ed8]",
          resolvedTone === "warn" && "bg-[#d97706]",
          resolvedTone === "danger" && "bg-[#be123c]",
          resolvedTone === "neutral" && "bg-[#64748b]"
        )}
        aria-hidden="true"
      />
      {text}
    </span>
  );
}
