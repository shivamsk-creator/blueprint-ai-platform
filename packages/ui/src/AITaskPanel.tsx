"use client";

import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import type { AIJob, AIModel, AITaskPolicy, AITaskType } from "@blueprint/domain";
import { Button, Card, CardBody, CardHeader, FieldLabel, Textarea } from "./primitives";
import { ProviderSelector } from "./ProviderSelector";
import { JobStatus } from "./JobStatus";

export interface AITaskPanelProps {
  title: string;
  description: string;
  taskType: AITaskType;
  models: AIModel[];
  policy?: AITaskPolicy | null;
  activeJob?: AIJob | null;
  running?: boolean;
  error?: string | null;
  ctaLabel?: string;
  onExecute: (params: { instructions: string; modelOverrideId?: string }) => Promise<void> | void;
  onCancelJob?: (jobId: string) => Promise<void> | void;
}

export function AITaskPanel({
  title,
  description,
  taskType,
  models,
  policy,
  activeJob,
  running = false,
  error,
  ctaLabel = "Run AI Task",
  onExecute,
  onCancelJob,
}: AITaskPanelProps) {
  const [instructions, setInstructions] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    await onExecute({
      instructions: instructions.trim(),
      modelOverrideId: selectedModelId || undefined,
    });
  };

  return (
    <Card className="border-[#bfdbfe] bg-gradient-to-b from-[#f8fbff] to-white">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#1d4ed8]" aria-hidden="true" />
            {title}
          </span>
        }
        subtitle={description}
      />
      <CardBody className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <ProviderSelector
            taskType={taskType}
            models={models}
            policy={policy}
            selectedModelId={selectedModelId}
            onChange={setSelectedModelId}
            disabled={running}
          />
          <div>
            <FieldLabel htmlFor={`ai-instructions-${taskType}`}>
              Task Guidance / Focus (optional)
            </FieldLabel>
            <Textarea
              id={`ai-instructions-${taskType}`}
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Emphasize multi-tenant isolation constraints and SOC2 audit controls..."
              disabled={running}
            />
          </div>
          {error && (
            <div role="alert" className="rounded-[8px] border border-[#fecdd3] bg-[#fff1f2] px-3 py-2 text-xs text-[#be123c]">
              {error}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[#64748b]">
              Executes asynchronously via worker; never overwrites active revisions.
            </span>
            <Button type="submit" loading={running}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {ctaLabel}
            </Button>
          </div>
        </form>

        {activeJob && <JobStatus job={activeJob} onCancel={onCancelJob} />}
      </CardBody>
    </Card>
  );
}
