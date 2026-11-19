import {
  ForbiddenError,
  IncompatibleModelError,
  ValidationError,
  type AIModel,
  type AIProviderMetadata,
  type AITaskPolicy,
  type AITaskType,
} from "@blueprint/domain";
import { assertModelCompatibleWithTask } from "./catalog";

export interface ResolveModelInput {
  taskType: AITaskType;
  providers: AIProviderMetadata[];
  models: AIModel[];
  policy?: AITaskPolicy | null;
  modelOverrideId?: string | null;
}

export interface ResolvedModelRoute {
  primary: AIModel;
  provider: AIProviderMetadata;
  fallback?: { model: AIModel; provider: AIProviderMetadata } | null;
  wasUserOverride: boolean;
  maxTokens: number;
}

export function resolveModelForTask(input: ResolveModelInput): ResolvedModelRoute {
  const enabledProviderMap = new Map(
    input.providers.filter((p) => p.enabled).map((p) => [p.id, p])
  );
  const modelMap = new Map(input.models.map((m) => [m.id, m]));
  const maxTokens = input.policy?.maxTokens ?? 8192;

  const findEligible = (modelId: string): { model: AIModel; provider: AIProviderMetadata } | null => {
    const model = modelMap.get(modelId) ?? input.models.find((m) => m.modelId === modelId);
    if (!model) return null;
    const provider = enabledProviderMap.get(model.providerId);
    if (!provider || !model.enabled) return null;
    return { model, provider };
  };

  // 1. User task-level override (does NOT mutate workspace default policy)
  if (input.modelOverrideId) {
    if (input.policy && !input.policy.allowUserOverride) {
      throw new ForbiddenError(
        `Task "${input.taskType}" does not permit per-task model overrides under current workspace policy.`
      );
    }
    const overrideModel =
      modelMap.get(input.modelOverrideId) ??
      input.models.find((m) => m.modelId === input.modelOverrideId);

    if (!overrideModel) {
      throw new ValidationError(`Requested model override "${input.modelOverrideId}" was not found.`);
    }
    const provider = enabledProviderMap.get(overrideModel.providerId);
    if (!provider) {
      throw new IncompatibleModelError(
        `Provider for model "${overrideModel.displayName}" is disabled or not configured.`
      );
    }
    if (
      input.policy &&
      input.policy.allowedModelIds.length > 0 &&
      !input.policy.allowedModelIds.includes(overrideModel.id) &&
      !input.policy.allowedModelIds.includes(overrideModel.modelId)
    ) {
      throw new ForbiddenError(
        `Model "${overrideModel.displayName}" is not in the workspace allowlist for task "${input.taskType}".`
      );
    }

    assertModelCompatibleWithTask(overrideModel, input.taskType);

    const fallback = input.policy?.fallbackModelId ? findEligible(input.policy.fallbackModelId) : null;
    return {
      primary: overrideModel,
      provider,
      fallback: fallback && fallback.model.id !== overrideModel.id ? fallback : null,
      wasUserOverride: true,
      maxTokens,
    };
  }

  // 2. Workspace task policy default
  if (input.policy?.defaultModelId) {
    const def = findEligible(input.policy.defaultModelId);
    if (def) {
      assertModelCompatibleWithTask(def.model, input.taskType);
      const fallback = input.policy.fallbackModelId ? findEligible(input.policy.fallbackModelId) : null;
      return {
        primary: def.model,
        provider: def.provider,
        fallback: fallback && fallback.model.id !== def.model.id ? fallback : null,
        wasUserOverride: false,
        maxTokens,
      };
    }
  }

  // 3. First enabled compatible model across enabled workspace providers
  for (const model of input.models) {
    const provider = enabledProviderMap.get(model.providerId);
    if (!provider || !model.enabled) continue;
    try {
      assertModelCompatibleWithTask(model, input.taskType);
      return {
        primary: model,
        provider,
        fallback: null,
        wasUserOverride: false,
        maxTokens,
      };
    } catch {
      continue;
    }
  }

  throw new IncompatibleModelError(
    `No enabled and compatible AI model is configured for task "${input.taskType}". Enable a provider in Settings -> AI Providers.`
  );
}

export function estimateUsageCostUsd(
  model: Pick<AIModel, "inputCostPer1mUsd" | "outputCostPer1mUsd">,
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (Math.max(0, inputTokens) / 1_000_000) * model.inputCostPer1mUsd;
  const outputCost = (Math.max(0, outputTokens) / 1_000_000) * model.outputCostPer1mUsd;
  return Number((inputCost + outputCost).toFixed(6));
}

export function evaluateBudgetGuard(params: {
  monthlySpendUsd: number;
  monthlyBudgetUsd?: number | null;
}): { status: "ok" | "warning" | "exceeded"; utilizationPct: number } {
  if (!params.monthlyBudgetUsd || params.monthlyBudgetUsd <= 0) {
    return { status: "ok", utilizationPct: 0 };
  }
  const utilizationPct = Math.round((params.monthlySpendUsd / params.monthlyBudgetUsd) * 100);
  if (params.monthlySpendUsd >= params.monthlyBudgetUsd) {
    return { status: "exceeded", utilizationPct };
  }
  if (utilizationPct >= 80) {
    return { status: "warning", utilizationPct };
  }
  return { status: "ok", utilizationPct };
}
