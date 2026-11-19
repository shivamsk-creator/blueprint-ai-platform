"use client";

import React from "react";
import type { TraceabilityMatrixReport } from "@blueprint/domain";
import { Card, CardBody, CardHeader, EmptyState, MetricTile } from "./primitives";
import { StatusBadge } from "./StatusBadge";

export function TraceabilityMatrix({
  matrix,
  onSelectRequirement,
}: {
  matrix: TraceabilityMatrixReport;
  onSelectRequirement?: (requirementId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile
          label="Overall Coverage"
          value={`${matrix.overallCoveragePct}%`}
          hint="Computed from live links"
          accent={matrix.overallCoveragePct >= 80 ? "emerald" : matrix.overallCoveragePct >= 50 ? "amber" : "crimson"}
        />
        <MetricTile
          label="Feature Linked"
          value={`${matrix.requirementsWithFeatures}/${matrix.totalRequirements}`}
          hint="Requirements mapped to MVP scope"
          accent="cobalt"
        />
        <MetricTile
          label="Task Linked"
          value={`${matrix.requirementsWithTasks}/${matrix.totalRequirements}`}
          hint="Mapped to dev breakdown"
          accent="cobalt"
        />
        <MetricTile
          label="QA Verified"
          value={`${matrix.requirementsWithTests}/${matrix.totalRequirements}`}
          hint="Covered by test cases"
          accent="emerald"
        />
      </div>

      <Card>
        <CardHeader
          title="Requirement-to-Delivery Traceability Matrix"
          subtitle="Direct and 2-hop coverage across features, UX screens, APIs, development tasks, and QA test cases."
        />
        <CardBody className="p-0">
          {matrix.rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No requirements to trace yet"
                description="Add requirements in the Knowledge Repository to compute live traceability coverage."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
                    <th className="px-4 py-2.5">Requirement</th>
                    <th className="px-4 py-2.5">Features</th>
                    <th className="px-4 py-2.5">Screens / APIs</th>
                    <th className="px-4 py-2.5">Dev Tasks</th>
                    <th className="px-4 py-2.5">QA Tests</th>
                    <th className="px-4 py-2.5 text-right">Coverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2f7]">
                  {matrix.rows.map((row) => (
                    <tr
                      key={row.requirementId}
                      onClick={onSelectRequirement ? () => onSelectRequirement(row.requirementId) : undefined}
                      className={onSelectRequirement ? "cursor-pointer hover:bg-[#f8fafc]" : undefined}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[#1d4ed8]">{row.requirementKey}</span>
                          <StatusBadge status={row.requirementStatus} />
                        </div>
                        <div className="mt-1 font-medium text-[#0f172a]">{row.requirementTitle}</div>
                      </td>
                      <td className="px-4 py-3">
                        {row.linkedFeatures.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.linkedFeatures.map((f) => (
                              <span key={f.id} className="rounded bg-[#eff6ff] px-1.5 py-0.5 font-mono text-[11px] text-[#1d4ed8]">
                                {f.key}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#be123c]">Missing</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.linkedScreens.map((s) => (
                            <span key={s.id} className="rounded bg-[#f1f5f9] px-1.5 py-0.5 font-mono text-[11px] text-[#334155]">
                              {s.key}
                            </span>
                          ))}
                          {row.linkedApiEndpoints.map((a) => (
                            <span key={a.id} className="rounded bg-[#f1f5f9] px-1.5 py-0.5 font-mono text-[11px] text-[#0284c7]">
                              {a.key}
                            </span>
                          ))}
                          {row.linkedScreens.length === 0 && row.linkedApiEndpoints.length === 0 && (
                            <span className="text-[#94a3b8]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.linkedTasks.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.linkedTasks.map((t) => (
                              <span key={t.id} className="rounded bg-[#f1f5f9] px-1.5 py-0.5 font-mono text-[11px] text-[#0f172a]">
                                {t.key}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#b45309]">Missing</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.linkedTests.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.linkedTests.map((tc) => (
                              <span key={tc.id} className="rounded bg-[#ecfdf5] px-1.5 py-0.5 font-mono text-[11px] text-[#047857]">
                                {tc.key}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#be123c]">Missing</span>
                        )}
                      </td>
                      <td className="bp-tabular px-4 py-3 text-right font-mono font-semibold">
                        <span
                          className={
                            row.coveragePct === 100
                              ? "text-[#047857]"
                              : row.coveragePct >= 60
                              ? "text-[#b45309]"
                              : "text-[#be123c]"
                          }
                        >
                          {row.coveragePct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
