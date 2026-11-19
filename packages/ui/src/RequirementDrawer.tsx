"use client";

import React, { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import type { Requirement } from "@blueprint/domain";
import { Button, FieldLabel, Input, Select, Textarea } from "./primitives";
import { StatusBadge } from "./StatusBadge";

export interface RequirementDrawerProps {
  requirement: Requirement | null;
  onClose: () => void;
  saving?: boolean;
  onSave?: (
    requirementId: string,
    updates: {
      title: string;
      description: string;
      priority: Requirement["priority"];
      status: Requirement["status"];
      acceptanceCriteria: string[];
      changeSummary: string;
    }
  ) => Promise<void> | void;
}

export function RequirementDrawer({
  requirement,
  onClose,
  saving = false,
  onSave,
}: RequirementDrawerProps) {
  const [title, setTitle] = useState(requirement?.title ?? "");
  const [description, setDescription] = useState(requirement?.description ?? "");
  const [priority, setPriority] = useState<Requirement["priority"]>(requirement?.priority ?? "medium");
  const [status, setStatus] = useState<Requirement["status"]>(requirement?.status ?? "proposed");
  const [criteriaText, setCriteriaText] = useState(
    (requirement?.acceptanceCriteria ?? []).join("\n")
  );
  const [changeSummary, setChangeSummary] = useState("");

  useEffect(() => {
    if (!requirement) return;
    setTitle(requirement.title);
    setDescription(requirement.description);
    setPriority(requirement.priority);
    setStatus(requirement.status);
    setCriteriaText(requirement.acceptanceCriteria.join("\n"));
    setChangeSummary("");
  }, [requirement]);

  useEffect(() => {
    if (!requirement) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requirement, onClose]);

  if (!requirement) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Edit ${requirement.requirementKey}`}>
      <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-[#1d4ed8]">{requirement.requirementKey}</span>
            <StatusBadge status={requirement.status} />
            <span className="font-mono text-xs text-[#64748b]">v{requirement.currentVersion}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close requirement drawer"
            className="rounded p-1 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <FieldLabel htmlFor="drawer-req-title" required>Title</FieldLabel>
            <Input id="drawer-req-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="drawer-req-status">Status</FieldLabel>
              <Select id="drawer-req-status" value={status} onChange={(e) => setStatus(e.target.value as Requirement["status"])}>
                <option value="proposed">Proposed</option>
                <option value="confirmed">Confirmed</option>
                <option value="deferred">Deferred</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="drawer-req-priority">Priority</FieldLabel>
              <Select id="drawer-req-priority" value={priority} onChange={(e) => setPriority(e.target.value as Requirement["priority"])}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="drawer-req-desc" required>Description</FieldLabel>
            <Textarea id="drawer-req-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <FieldLabel htmlFor="drawer-req-ac">Acceptance Criteria (one per line)</FieldLabel>
            <Textarea
              id="drawer-req-ac"
              rows={4}
              value={criteriaText}
              onChange={(e) => setCriteriaText(e.target.value)}
            />
          </div>

          <div>
            <FieldLabel htmlFor="drawer-req-summary">Revision Note</FieldLabel>
            <Input
              id="drawer-req-summary"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="Reason for change (triggers downstream impact check if confirmed)"
            />
          </div>

          {requirement.revisions && requirement.revisions.length > 0 && (
            <div className="border-t border-[#e2e8f0] pt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                Revision History
              </div>
              <ul className="space-y-2 text-xs">
                {requirement.revisions.map((rev) => (
                  <li key={rev.id} className="rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
                    <span className="font-mono font-semibold text-[#0f172a]">v{rev.versionNo}</span>{" "}
                    <span className="text-[#475569]">— {rev.changeSummary}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e2e8f0] bg-[#f8fafc] px-5 py-3">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {onSave && (
            <Button
              loading={saving}
              onClick={() =>
                onSave(requirement.id, {
                  title,
                  description,
                  priority,
                  status,
                  acceptanceCriteria: criteriaText
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  changeSummary: changeSummary.trim() || "Updated requirement",
                })
              }
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              Save Revision
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
