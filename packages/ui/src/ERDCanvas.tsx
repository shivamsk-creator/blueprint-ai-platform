"use client";

import React, { useState } from "react";
import { Key, ShieldCheck, ZoomIn, ZoomOut } from "lucide-react";
import type { DbEntity, DbRelationship } from "@blueprint/domain";
import { Button, Card, CardBody, CardHeader, EmptyState } from "./primitives";

export function ERDCanvas({
  entities,
  relationships,
}: {
  entities: DbEntity[];
  relationships: DbRelationship[];
}) {
  const [zoom, setZoom] = useState(1);

  if (entities.length === 0) {
    return (
      <EmptyState
        title="No database entities modeled yet"
        description="Add a table entity below to visualize columns, primary keys, RLS status, and SQL migrations."
      />
    );
  }

  const entityMap = new Map(entities.map((e) => [e.id, e]));

  return (
    <Card>
      <CardHeader
        title="Entity-Relationship Diagram (Structured ERD)"
        subtitle={`${entities.length} table(s) · ${relationships.length} foreign key relationship(s)`}
        action={
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(1))))} aria-label="Zoom out ERD">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="bp-tabular w-12 text-center font-mono text-xs text-[#475569]">
              {Math.round(zoom * 100)}%
            </span>
            <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))} aria-label="Zoom in ERD">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />
      <CardBody className="bp-grid-bg overflow-auto p-6">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
          className="grid min-w-[680px] grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          {entities.map((entity) => (
            <div
              key={entity.id}
              className="overflow-hidden rounded-[10px] border border-[#c2cede] bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-[#1e293b] bg-[#0b1220] px-3.5 py-2.5 text-white">
                <span className="font-mono text-xs font-semibold">
                  {entity.schemaName}.{entity.tableName}
                </span>
                {entity.rlsEnabled ? (
                  <span className="inline-flex items-center gap-1 rounded bg-[#047857]/25 px-1.5 py-0.5 text-[10px] font-semibold text-[#6ee7b7]">
                    <ShieldCheck className="h-3 w-3" /> RLS
                  </span>
                ) : (
                  <span className="rounded bg-[#be123c]/30 px-1.5 py-0.5 text-[10px] font-semibold text-[#fda4af]">
                    NO RLS
                  </span>
                )}
              </div>
              <ul className="divide-y divide-[#eef2f7] text-xs">
                {entity.attributes.map((attr) => (
                  <li key={attr.id} className="flex items-center justify-between gap-2 px-3.5 py-2">
                    <span className="flex items-center gap-1.5 font-mono text-[#0f172a]">
                      {attr.isPrimaryKey && (
                        <Key className="h-3 w-3 text-[#d97706]" aria-label="Primary key" />
                      )}
                      {attr.columnName}
                      {!attr.isNullable && !attr.isPrimaryKey && (
                        <span className="text-[10px] text-[#be123c]" title="NOT NULL">*</span>
                      )}
                    </span>
                    <span className="font-mono text-[11px] text-[#64748b]">{attr.dataType}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {relationships.length > 0 && (
          <div className="mt-5 rounded-[10px] border border-[#dce3ee] bg-white/95 p-3.5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
              Foreign Key Relationships
            </div>
            <div className="flex flex-wrap gap-2">
              {relationships.map((rel) => {
                const src = entityMap.get(rel.sourceEntityId);
                const tgt = entityMap.get(rel.targetEntityId);
                if (!src || !tgt) return null;
                return (
                  <span
                    key={rel.id}
                    className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1 font-mono text-[11px] text-[#1e3a8a]"
                  >
                    {src.tableName}.{rel.sourceColumn} → {tgt.tableName}.{rel.targetColumn} ({rel.onDelete})
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
