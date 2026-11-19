"use client";

import React, { useState } from "react";
import { Save, Sparkles, GitCompare, History } from "lucide-react";
import type { Artifact, ArtifactRevision } from "@blueprint/domain";
import { Button, Card, CardBody, CardHeader, FieldLabel, Input, Select, Textarea } from "./primitives";
import { StatusBadge } from "./StatusBadge";

export interface ArtifactEditorProps {
  artifact: Artifact;
  revisions: ArtifactRevision[];
  saving?: boolean;
  regeneratingSection?: string | null;
  onSaveRevision: (payload: {
    sections: ArtifactRevision["content"]["sections"];
    changeSummary: string;
    status: ArtifactRevision["status"];
    baseRevisionId?: string;
  }) => Promise<void> | void;
  onRegenerateSection?: (payload: {
    baseRevisionId: string;
    sectionKey: string;
    instructions: string;
  }) => Promise<void> | void;
  onInspectDiff?: (revisionId: string) => void;
}

export function ArtifactEditor({
  artifact,
  revisions,
  saving = false,
  regeneratingSection = null,
  onSaveRevision,
  onRegenerateSection,
  onInspectDiff,
}: ArtifactEditorProps) {
  const initialRev =
    revisions.find((r) => r.id === artifact.currentRevisionId) ?? revisions[0] ?? null;

  const [selectedRevId, setSelectedRevId] = useState<string>(initialRev?.id ?? "");
  const activeRevision = revisions.find((r) => r.id === selectedRevId) ?? initialRev;

  const [sections, setSections] = useState<ArtifactRevision["content"]["sections"]>(
    activeRevision?.content.sections ?? [
      { sectionKey: "overview", heading: "1. Overview", orderIndex: 0, bodyMarkdown: "" },
    ]
  );
  const [activeKey, setActiveKey] = useState<string>(sections[0]?.sectionKey ?? "overview");
  const [changeSummary, setChangeSummary] = useState("");
  const [nextStatus, setNextStatus] = useState<ArtifactRevision["status"]>("draft");
  const [regenPrompt, setRegenPrompt] = useState("");
  const [showRegen, setShowRegen] = useState(false);

  const selectRevision = (revId: string): void => {
    setSelectedRevId(revId);
    const found = revisions.find((r) => r.id === revId);
    if (found) {
      setSections(found.content.sections);
      setActiveKey(found.content.sections[0]?.sectionKey ?? "");
    }
  };

  const activeSection = sections.find((s) => s.sectionKey === activeKey) ?? sections[0];
  const candidateRevisions = revisions.filter(
    (r) => r.id !== artifact.currentRevisionId && (r.source === "ai_generated" || r.source === "ai_section_regen")
  );

  const updateBody = (bodyMarkdown: string): void => {
    setSections((prev) =>
      prev.map((s) => (s.sectionKey === activeSection?.sectionKey ? { ...s, bodyMarkdown } : s))
    );
  };

  return (
    <div className="space-y-4">
      {candidateRevisions.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-xs text-[#92400e]">
          <span>
            <strong>{candidateRevisions.length} AI candidate revision(s)</strong> pending review. Active user revision was preserved.
          </span>
          {onInspectDiff && candidateRevisions[0] && (
            <Button size="sm" variant="outline" onClick={() => onInspectDiff(candidateRevisions[0]!.id)}>
              <GitCompare className="h-3.5 w-3.5" aria-hidden="true" />
              Compare Candidate v{candidateRevisions[0].versionNo}
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardHeader
          title={
            <div className="flex flex-wrap items-center gap-2">
              <span>{artifact.title}</span>
              {activeRevision && (
                <>
                  <span className="rounded bg-[#f1f5f9] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#334155]">
                    v{activeRevision.versionNo}
                  </span>
                  <StatusBadge status={activeRevision.status} />
                </>
              )}
              {artifact.needsReview && <StatusBadge status="needs_input" label="Impact Review Required" />}
            </div>
          }
          subtitle="Immutable revision history — saving creates a new numbered revision without mutating prior snapshots."
          action={
            <div className="flex flex-wrap items-center gap-2">
              {revisions.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-[#64748b]" aria-hidden="true" />
                  <Select
                    aria-label="Select artifact revision"
                    value={activeRevision?.id ?? ""}
                    onChange={(e) => selectRevision(e.target.value)}
                    className="h-8 w-44 text-xs"
                  >
                    {revisions.map((rev) => (
                      <option key={rev.id} value={rev.id}>
                        v{rev.versionNo} · {rev.status}
                        {rev.id === artifact.currentRevisionId ? " (current)" : ""}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {onInspectDiff && activeRevision && (
                <Button size="sm" variant="outline" onClick={() => onInspectDiff(activeRevision.id)}>
                  <GitCompare className="h-3.5 w-3.5" aria-hidden="true" />
                  Diff
                </Button>
              )}
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Section Outline */}
          <div className="border-b border-[#e8edf5] bg-[#f8fafc] p-4 lg:col-span-3 lg:border-b-0 lg:border-r">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
              Document Outline
            </div>
            <ul className="space-y-1">
              {sections.map((sec) => (
                <li key={sec.sectionKey}>
                  <button
                    type="button"
                    onClick={() => setActiveKey(sec.sectionKey)}
                    className={`w-full rounded-[7px] px-3 py-2 text-left text-xs font-medium transition-colors ${
                      sec.sectionKey === activeSection?.sectionKey
                        ? "bg-[#eff6ff] text-[#1d4ed8] font-semibold"
                        : "text-[#334155] hover:bg-white"
                    }`}
                  >
                    {sec.heading}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Section Content Editor */}
          <CardBody className="space-y-4 lg:col-span-9">
            {activeSection && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-semibold text-[#0f172a]">{activeSection.heading}</h4>
                  {onRegenerateSection && activeRevision && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowRegen((v) => !v)}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#1d4ed8]" aria-hidden="true" />
                      Regenerate Section
                    </Button>
                  )}
                </div>

                {showRegen && onRegenerateSection && activeRevision && (
                  <div className="space-y-2 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff]/60 p-3.5">
                    <FieldLabel htmlFor="section-regen-prompt">
                      Section Regeneration Instructions
                    </FieldLabel>
                    <Textarea
                      id="section-regen-prompt"
                      rows={2}
                      value={regenPrompt}
                      onChange={(e) => setRegenPrompt(e.target.value)}
                      placeholder="Describe how AI should refine this section (creates candidate revision for diff review)..."
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setShowRegen(false)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        loading={regeneratingSection === activeSection.sectionKey}
                        disabled={regenPrompt.trim().length < 3}
                        onClick={async () => {
                          await onRegenerateSection({
                            baseRevisionId: activeRevision.id,
                            sectionKey: activeSection.sectionKey,
                            instructions: regenPrompt.trim(),
                          });
                          setRegenPrompt("");
                          setShowRegen(false);
                        }}
                      >
                        Enqueue Candidate Patch
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <FieldLabel htmlFor="section-markdown-editor">Section Content (Markdown)</FieldLabel>
                  <Textarea
                    id="section-markdown-editor"
                    rows={12}
                    value={activeSection.bodyMarkdown}
                    onChange={(e) => updateBody(e.target.value)}
                    className="font-mono text-xs leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 border-t border-[#eef2f7] pt-4 sm:grid-cols-12">
                  <div className="sm:col-span-6">
                    <FieldLabel htmlFor="rev-change-summary">Revision Change Summary</FieldLabel>
                    <Input
                      id="rev-change-summary"
                      value={changeSummary}
                      onChange={(e) => setChangeSummary(e.target.value)}
                      placeholder="Summarize what changed in this revision..."
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <FieldLabel htmlFor="rev-status">Next Status</FieldLabel>
                    <Select
                      id="rev-status"
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value as ArtifactRevision["status"])}
                    >
                      <option value="draft">Draft</option>
                      <option value="in_review">In Review</option>
                    </Select>
                  </div>
                  <div className="flex items-end sm:col-span-3">
                    <Button
                      className="w-full"
                      loading={saving}
                      onClick={() =>
                        onSaveRevision({
                          sections,
                          changeSummary: changeSummary.trim() || `Updated ${activeSection.heading}`,
                          status: nextStatus,
                          baseRevisionId: activeRevision?.id,
                        })
                      }
                    >
                      <Save className="h-3.5 w-3.5" aria-hidden="true" />
                      Save Revision
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardBody>
        </div>
      </Card>
    </div>
  );
}
