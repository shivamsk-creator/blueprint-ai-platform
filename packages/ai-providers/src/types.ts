import type { AIModelCapabilities, AIProviderType, AITaskType } from "@blueprint/domain";

export interface AIProviderCredentials {
  apiKey: string;
  baseUrl?: string | null;
}

export interface AIGenerateRequest {
  modelId: string;
  systemPrompt: string;
  userPrompt: string;
  expectJson?: boolean;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface AITokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AIGenerateResponse {
  text: string;
  parsedJson?: unknown;
  usage: AITokenUsage;
  latencyMs: number;
  providerRequestId?: string;
  modelId: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  latencyMs: number;
  message: string;
  discoveredModels?: string[];
}

export interface AIProviderAdapter {
  readonly providerType: AIProviderType;
  generate(request: AIGenerateRequest, credentials: AIProviderCredentials): Promise<AIGenerateResponse>;
  testConnection(credentials: AIProviderCredentials, timeoutMs?: number): Promise<ConnectionTestResult>;
}

export interface BuiltinModelDefinition {
  providerType: AIProviderType;
  modelId: string;
  displayName: string;
  capabilities: AIModelCapabilities;
  inputCostPer1mUsd: number;
  outputCostPer1mUsd: number;
}

export interface TaskCapabilityRequirement {
  taskType: AITaskType;
  requiresStructuredOutput: boolean;
  requiresLongContext: boolean;
  requiresReasoning: boolean;
  minContextWindow: number;
  deterministicPreferred: boolean;
}
