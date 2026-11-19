"use client";

import React from "react";
import type { AIModel, AITaskPolicy, AITaskType } from "@blueprint/domain";
import { FieldLabel, Select } from "./primitives";

export interface ProviderSelectorProps {
  taskType: AITaskType;
  models: AIModel[];
  policy?: AITaskPolicy | null;
  selectedModelId: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

export function ProviderSelector({
  taskType,
  models,
  policy,
  selectedModelId,
  onChange,
  disabled = false,
}: ProviderSelectorProps) {
  const defaultModel = models.find((m) => m.id === policy?.defaultModelId);
  const allowOverride = policy?.allowUserOverride ?? true;
  const isOverride = Boolean(selectedModelId && selectedModelId !== policy?.defaultModelId);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={`model-select-${taskType}`}>AI Provider / Model</FieldLabel>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            isOverride
              ? "bg-[#fffbeb] text-[#b45309] border border-[#fde68a]"
              : "bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]"
          }`}
        >
          {isOverride ? "Task Override" : "Workspace Default"}
        </span>
      </div>
      <Select
        id={`model-select-${taskType}`}
        value={selectedModelId}
        disabled={disabled || !allowOverride}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">
          {defaultModel
            ? `Workspace default (${defaultModel.displayName})`
            : "Workspace default (auto-select compatible)"}
        </option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.displayName} ({m.providerDisplayName ?? m.providerType})
            {!m.capabilities.structuredOutput ? " — [No JSON Output]" : ""}
          </option>
        ))}
      </Select>
      {!allowOverride && (
        <p className="text-[11px] text-[#64748b]">
          Workspace policy locks model selection for <code className="font-mono">{taskType}</code>.
        </p>
      )}
    </div>
  );
}
