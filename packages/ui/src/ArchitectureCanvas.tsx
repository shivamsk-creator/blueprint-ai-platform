"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import type { ArchitectureComponent, ArchitectureRelationship } from "@blueprint/domain";
import { Card, CardBody, CardHeader, EmptyState } from "./primitives";

const LAYERS: Array<{ key: ArchitectureComponent["layer"]; label: string; accent: string }> = [
  { key: "client", label: "Client & Presentation", accent: "border-t-[#1d4ed8]" },
  { key: "edge", label: "Edge & Gateway", accent: "border-t-[#0284c7]" },
  { key: "application", label: "Application Services", accent: "border-t-[#0f766e]" },
  { key: "worker", label: "Async Workers & Queues", accent: "border-t-[#d97706]" },
  { key: "data", label: "Persistence & Storage", accent: "border-t-[#334155]" },
  { key: "external", label: "External Providers", accent: "border-t-[#7c3aed]" },
];

export function ArchitectureCanvas({
  components,
  relationships,
}: {
  components: ArchitectureComponent[];
  relationships: ArchitectureRelationship[];
}) {
  if (components.length === 0) {
    return (
      <EmptyState
        title="No architecture components defined"
        description="Add structured components across client, application, worker, and data layers."
      />
    );
  }

  const compMap = new Map(components.map((c) => [c.id, c]));
  const activeLayers = LAYERS.filter((l) => components.some((c) => c.layer === l.key));

  return (
    <Card>
      <CardHeader
        title="Structured System Architecture Topology"
        subtitle="Editable component graph backed by relational component nodes and protocol edges (never image-only)."
      />
      <CardBody className="bp-grid-bg space-y-5 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {activeLayers.map((layer) => (
            <div key={layer.key} className="space-y-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
                {layer.label}
              </div>
              {components
                .filter((c) => c.layer === layer.key)
                .map((comp) => (
                  <div
                    key={comp.id}
                    className={`rounded-[10px] border border-[#c2cede] border-t-2 ${layer.accent} bg-white p-3.5 shadow-xs`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#1d4ed8]">
                        {comp.componentKey}
                      </span>
                      <span className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] font-medium text-[#475569]">
                        {comp.technology}
                      </span>
                    </div>
                    <h4 className="mt-1.5 text-sm font-semibold text-[#0f172a]">{comp.name}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-[#64748b]">{comp.responsibility}</p>
                  </div>
                ))}
            </div>
          ))}
        </div>

        {relationships.length > 0 && (
          <div className="rounded-[10px] border border-[#dce3ee] bg-white p-4">
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
              Component Data Flows & Protocols
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {relationships.map((rel) => {
                const src = compMap.get(rel.sourceComponentId);
                const tgt = compMap.get(rel.targetComponentId);
                if (!src || !tgt) return null;
                return (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between gap-2 rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-xs"
                  >
                    <span className="flex items-center gap-1.5 font-medium text-[#0f172a]">
                      <span className="font-mono text-[#1d4ed8]">{src.componentKey}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#64748b]" />
                      <span className="font-mono text-[#1d4ed8]">{tgt.componentKey}</span>
                    </span>
                    <span className="text-[11px] text-[#475569]">
                      {rel.protocol} · {rel.isAsync ? "Async" : "Sync"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
