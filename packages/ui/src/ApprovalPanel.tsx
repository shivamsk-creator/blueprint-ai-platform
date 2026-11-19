"use client";

import React, { useState } from "react";
import { CheckCircle2, MessageSquareWarning, XCircle } from "lucide-react";
import type { Approval, ArtifactRevision } from "@blueprint/domain";
import { Button, Card, CardBody, CardHeader, FieldLabel, Textarea } from "./primitives";
import { StatusBadge } from "./StatusBadge";

export interface ApprovalPanelProps {
  artifactTitle: string;
  revision: ArtifactRevision;
  approvals: Approval[];
  canApprove: boolean;
  submitting?: boolean;
  onDecide: (payload: {
    revisionId: string;
    decision: Approval["decision"];
    comment: string;
  }) => Promise<void> | void;
}

export function ApprovalPanel({
  artifactTitle,
  revision,
  approvals,
  canApprove,
  submitting = false,
  onDecide,
}: ApprovalPanelProps) {
  const [comment, setComment] = useState("");
  const revApprovals = approvals.filter((a) => a.targetRevisionId === revision.id);

  return (
    <Card>
      <CardHeader
        title={`Governance Review — ${artifactTitle} (v${revision.versionNo})`}
        subtitle={`Decisions bind permanently to exact immutable revision ID ${revision.id.slice(0, 8)}.`}
        action={<StatusBadge status={revision.status} />}
      />
      <CardBody className="space-y-4">
        {canApprove ? (
          <div className="space-y-3">
            <div>
              <FieldLabel htmlFor={`approval-comment-${revision.id}`}>Review Comment</FieldLabel>
              <Textarea
                id={`approval-comment-${revision.id}`}
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Record approval rationale or required changes..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                loading={submitting}
                onClick={async () => {
                  await onDecide({ revisionId: revision.id, decision: "approved", comment: comment.trim() });
                  setComment("");
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Approve Exact Revision v{revision.versionNo}
              </Button>
              <Button
                variant="secondary"
                loading={submitting}
                onClick={async () => {
                  await onDecide({ revisionId: revision.id, decision: "changes_requested", comment: comment.trim() });
                  setComment("");
                }}
              >
                <MessageSquareWarning className="h-3.5 w-3.5" aria-hidden="true" />
                Request Changes
              </Button>
              <Button
                variant="danger"
                loading={submitting}
                onClick={async () => {
                  await onDecide({ revisionId: revision.id, decision: "rejected", comment: comment.trim() });
                  setComment("");
                }}
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Reject
              </Button>
            </div>
          </div>
        ) : (
          <p className="rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-xs text-[#475569]">
            Reviewer, Manager, Admin, or Owner role is required to record approval decisions.
          </p>
        )}

        {revApprovals.length > 0 && (
          <div className="space-y-2 border-t border-[#eef2f7] pt-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
              Decisions on Revision v{revision.versionNo}
            </div>
            {revApprovals.map((ap) => (
              <div key={ap.id} className="rounded-[8px] border border-[#dce3ee] bg-[#f8fafc] px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#0f172a]">{ap.reviewerName ?? ap.reviewerId}</span>
                  <StatusBadge status={ap.decision} />
                </div>
                {ap.comment && <p className="mt-1 text-[#475569]">{ap.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
