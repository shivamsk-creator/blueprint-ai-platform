"use client";

import React from "react";
import type { ValidationIssue } from "@blueprint/domain";
import { Card, CardBody, CardHeader, EmptyState } from "./primitives";
import { StatusBadge } from "./StatusBadge";

export function ValidationIssueList({
  issues,
  title = "Detected Gaps & Consistency Issues",
}: {
  issues: ValidationIssue[];
  title?: string;
}) {
  const severityOrder: Record<ValidationIssue["severity"], number> = {
    blocker: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };
  const sorted = [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={`${issues.length} issue(s) identified across requirements, traceability, schema, and API contracts.`}
      />
      <CardBody className="space-y-3">
        {sorted.length === 0 ? (
          <EmptyState
            title="Zero validation issues detected"
            description="All deterministic rules and consistency checks passed for this project snapshot."
          />
        ) : (
          sorted.map((issue) => (
            <div
              key={issue.id}
              className="rounded-[10px] border border-[#dce3ee] bg-white p-4 transition-colors hover:border-[#c2cede]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={issue.severity} />
                  <span className="rounded bg-[#f1f5f9] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#475569]">
                    {issue.ruleCode}
                  </span>
                  <h4 className="text-sm font-semibold text-[#0f172a]">{issue.title}</h4>
                </div>
                <StatusBadge status={issue.status} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#334155]">{issue.description}</p>
              {issue.recommendation && (
                <div className="mt-2.5 rounded-[8px] border border-[#bfdbfe] bg-[#eff6ff]/60 px-3 py-2 text-xs text-[#1e3a8a]">
                  <strong>Recommendation:</strong> {issue.recommendation}
                </div>
              )}
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}
