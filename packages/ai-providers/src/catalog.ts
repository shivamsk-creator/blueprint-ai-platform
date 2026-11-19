import {
  IncompatibleModelError,
  type AIModel,
  type AIProviderType,
  type AITaskType,
} from "@blueprint/domain";
import type { BuiltinModelDefinition, TaskCapabilityRequirement } from "./types";

export const BUILTIN_MODEL_CATALOG: ReadonlyArray<BuiltinModelDefinition> = [
  {
    providerType: "openai",
    modelId: "gpt-4.1",
    displayName: "OpenAI GPT-4.1",
    capabilities: {
      structuredOutput: true,
      tools: true,
      vision: true,
      reasoning: true,
      longContext: true,
      contextWindow: 1_000_000,
      maxOutputTokens: 32_768,
    },
    inputCostPer1mUsd: 2.0,
    outputCostPer1mUsd: 8.0,
  },
  {
    providerType: "openai",
    modelId: "gpt-4.1-mini",
    displayName: "OpenAI GPT-4.1 Mini",
    capabilities: {
      structuredOutput: true,
      tools: true,
      vision: true,
      reasoning: false,
      longContext: true,
      contextWindow: 1_000_000,
      maxOutputTokens: 16_384,
    },
    inputCostPer1mUsd: 0.4,
    outputCostPer1mUsd: 1.6,
  },
  {
    providerType: "google",
    modelId: "gemini-2.5-pro",
    displayName: "Google Gemini 2.5 Pro",
    capabilities: {
      structuredOutput: true,
      tools: true,
      vision: true,
      reasoning: true,
      longContext: true,
      contextWindow: 1_048_576,
      maxOutputTokens: 65_536,
    },
    inputCostPer1mUsd: 1.25,
    outputCostPer1mUsd: 10.0,
  },
  {
    providerType: "google",
    modelId: "gemini-2.5-flash",
    displayName: "Google Gemini 2.5 Flash",
    capabilities: {
      structuredOutput: true,
      tools: true,
      vision: true,
      reasoning: true,
      longContext: true,
      contextWindow: 1_048_576,
      maxOutputTokens: 65_536,
    },
    inputCostPer1mUsd: 0.15,
    outputCostPer1mUsd: 0.6,
  },
  {
    providerType: "anthropic",
    modelId: "claude-sonnet-4-20250514",
    displayName: "Anthropic Claude Sonnet 4",
    capabilities: {
      structuredOutput: true,
      tools: true,
      vision: true,
      reasoning: true,
      longContext: true,
      contextWindow: 200_000,
      maxOutputTokens: 16_384,
    },
    inputCostPer1mUsd: 3.0,
    outputCostPer1mUsd: 15.0,
  },
  {
    providerType: "anthropic",
    modelId: "claude-3-5-haiku-latest",
    displayName: "Anthropic Claude Haiku",
    capabilities: {
      structuredOutput: true,
      tools: true,
      vision: false,
      reasoning: false,
      longContext: true,
      contextWindow: 200_000,
      maxOutputTokens: 8_192,
    },
    inputCostPer1mUsd: 0.8,
    outputCostPer1mUsd: 4.0,
  },
  {
    providerType: "openai_compatible",
    modelId: "llama-3.3-70b-instruct",
    displayName: "OpenAI-Compatible Llama 3.3 70B",
    capabilities: {
      structuredOutput: true,
      tools: true,
      vision: false,
      reasoning: false,
      longContext: true,
      contextWindow: 128_000,
      maxOutputTokens: 8_192,
    },
    inputCostPer1mUsd: 0.5,
    outputCostPer1mUsd: 0.8,
  },
];

export const TASK_CAPABILITY_REQUIREMENTS: Record<AITaskType, TaskCapabilityRequirement> = {
  requirement_analysis: {
    taskType: "requirement_analysis",
    requiresStructuredOutput: true,
    requiresLongContext: true,
    requiresReasoning: false,
    minContextWindow: 64_000,
    deterministicPreferred: false,
  },
  clarification_generation: {
    taskType: "clarification_generation",
    requiresStructuredOutput: true,
    requiresLongContext: false,
    requiresReasoning: false,
    minContextWindow: 16_000,
    deterministicPreferred: false,
  },
  research_synthesis: {
    taskType: "research_synthesis",
    requiresStructuredOutput: true,
    requiresLongContext: true,
    requiresReasoning: false,
    minContextWindow: 64_000,
    deterministicPreferred: false,
  },
  brd_generation: {
    taskType: "brd_generation",
    requiresStructuredOutput: true,
    requiresLongContext: true,
    requiresReasoning: false,
    minContextWindow: 64_000,
    deterministicPreferred: false,
  },
  prd_generation: {
    taskType: "prd_generation",
    requiresStructuredOutput: true,
    requiresLongContext: true,
    requiresReasoning: false,
    minContextWindow: 64_000,
    deterministicPreferred: false,
  },
  scope_recommendation: {
    taskType: "scope_recommendation",
    requiresStructuredOutput: true,
    requiresLongContext: false,
    requiresReasoning: true,
    minContextWindow: 32_000,
    deterministicPreferred: false,
  },
  ux_spec_generation: {
    taskType: "ux_spec_generation",
    requiresStructuredOutput: true,
    requiresLongContext: false,
    requiresReasoning: false,
    minContextWindow: 32_000,
    deterministicPreferred: false,
  },
  architecture_generation: {
    taskType: "architecture_generation",
    requiresStructuredOutput: true,
    requiresLongContext: true,
    requiresReasoning: true,
    minContextWindow: 64_000,
    deterministicPreferred: false,
  },
  database_generation: {
    taskType: "database_generation",
    requiresStructuredOutput: true,
    requiresLongContext: false,
    requiresReasoning: false,
    minContextWindow: 32_000,
    deterministicPreferred: false,
  },
  api_generation: {
    taskType: "api_generation",
    requiresStructuredOutput: true,
    requiresLongContext: false,
    requiresReasoning: false,
    minContextWindow: 32_000,
    deterministicPreferred: false,
  },
  development_breakdown: {
    taskType: "development_breakdown",
    requiresStructuredOutput: true,
    requiresLongContext: false,
    requiresReasoning: false,
    minContextWindow: 32_000,
    deterministicPreferred: false,
  },
  qa_generation: {
    taskType: "qa_generation",
    requiresStructuredOutput: true,
    requiresLongContext: false,
    requiresReasoning: false,
    minContextWindow: 32_000,
    deterministicPreferred: false,
  },
  consistency_validation: {
    taskType: "consistency_validation",
    requiresStructuredOutput: true,
    requiresLongContext: true,
    requiresReasoning: true,
    minContextWindow: 64_000,
    deterministicPreferred: false,
  },
  change_impact: {
    taskType: "change_impact",
    requiresStructuredOutput: true,
    requiresLongContext: true,
    requiresReasoning: false,
    minContextWindow: 64_000,
    deterministicPreferred: false,
  },
  export_rendering: {
    taskType: "export_rendering",
    requiresStructuredOutput: false,
    requiresLongContext: false,
    requiresReasoning: false,
    minContextWindow: 0,
    deterministicPreferred: true,
  },
};

export function getBuiltinModelsForProvider(providerType: AIProviderType): BuiltinModelDefinition[] {
  return BUILTIN_MODEL_CATALOG.filter((m) => m.providerType === providerType);
}

export function checkModelTaskCompatibility(
  model: Pick<AIModel, "modelId" | "displayName" | "enabled" | "capabilities">,
  taskType: AITaskType
): { compatible: boolean; reasons: string[] } {
  const req = TASK_CAPABILITY_REQUIREMENTS[taskType];
  const reasons: string[] = [];

  if (!model.enabled) {
    reasons.push(`Model "${model.displayName}" is disabled in workspace settings.`);
  }
  if (req.requiresStructuredOutput && !model.capabilities.structuredOutput) {
    reasons.push(`Task "${taskType}" requires structured JSON output, which "${model.modelId}" does not support.`);
  }
  if (req.requiresLongContext && !model.capabilities.longContext && model.capabilities.contextWindow < req.minContextWindow) {
    reasons.push(
      `Task "${taskType}" requires long context (>= ${req.minContextWindow.toLocaleString()} tokens); "${model.modelId}" supports ${model.capabilities.contextWindow.toLocaleString()}.`
    );
  }
  if (req.requiresReasoning && !model.capabilities.reasoning) {
    reasons.push(`Task "${taskType}" requires reasoning capability, which "${model.modelId}" does not declare.`);
  }

  return { compatible: reasons.length === 0, reasons };
}

export function assertModelCompatibleWithTask(
  model: Pick<AIModel, "modelId" | "displayName" | "enabled" | "capabilities">,
  taskType: AITaskType
): void {
  const check = checkModelTaskCompatibility(model, taskType);
  if (!check.compatible) {
    throw new IncompatibleModelError(check.reasons.join(" "));
  }
}
