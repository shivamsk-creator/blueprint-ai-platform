import { ExternalProviderError, ValidationError, type AIProviderType } from "@blueprint/domain";
import type {
  AIGenerateRequest,
  AIGenerateResponse,
  AIProviderAdapter,
  AIProviderCredentials,
  ConnectionTestResult,
} from "./types";

type FetchFn = typeof fetch;

function redactSecret(text: string, secret: string): string {
  if (!secret || secret.length < 6) return text;
  return text.split(secret).join("[REDACTED]");
}

function validateSafeBaseUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ValidationError("Provider base URL must be a valid HTTPS URL.");
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new ValidationError("Provider base URL must use HTTPS.");
  }
  const blockedHosts = new Set(["169.254.169.254", "metadata.google.internal", "0.0.0.0"]);
  if (blockedHosts.has(parsed.hostname)) {
    throw new ValidationError("Provider base URL targets a blocked internal metadata host.");
  }
  return parsed.toString().replace(/\/+$/, "");
}

function parseJsonSafely(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(candidate);
}

function createTimeoutSignal(timeoutMs: number, externalSignal?: AbortSignal): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!externalSignal) return timeoutSignal;
  return AbortSignal.any([timeoutSignal, externalSignal]);
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export class OpenAICompatibleAdapter implements AIProviderAdapter {
  public readonly providerType: AIProviderType;
  private readonly defaultBaseUrl: string;
  private readonly fetchFn: FetchFn;

  constructor(
    providerType: "openai" | "openai_compatible" = "openai",
    defaultBaseUrl = "https://api.openai.com/v1",
    fetchFn: FetchFn = fetch
  ) {
    this.providerType = providerType;
    this.defaultBaseUrl = defaultBaseUrl;
    this.fetchFn = fetchFn;
  }

  async generate(
    request: AIGenerateRequest,
    credentials: AIProviderCredentials
  ): Promise<AIGenerateResponse> {
    const baseUrl = credentials.baseUrl
      ? validateSafeBaseUrl(credentials.baseUrl)
      : this.defaultBaseUrl;
    const started = Date.now();
    const timeoutMs = request.timeoutMs ?? 60_000;

    const body: Record<string, unknown> = {
      model: request.modelId,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 4096,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
    };
    if (request.expectJson) {
      body.response_format = { type: "json_object" };
    }

    let response: Response;
    try {
      response = await this.fetchFn(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credentials.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: createTimeoutSignal(timeoutMs, request.signal),
      });
    } catch (err) {
      const msg = redactSecret(err instanceof Error ? err.message : "Network error", credentials.apiKey);
      throw new ExternalProviderError(`${this.providerType} request failed: ${msg}`, true);
    }

    if (!response.ok) {
      const rawErr = redactSecret((await response.text()).slice(0, 400), credentials.apiKey);
      throw new ExternalProviderError(
        `${this.providerType} HTTP ${response.status}: ${rawErr}`,
        isRetryableHttpStatus(response.status)
      );
    }

    const payload = (await response.json()) as {
      id?: string;
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const text = payload.choices?.[0]?.message?.content ?? "";
    const inputTokens = payload.usage?.prompt_tokens ?? 0;
    const outputTokens = payload.usage?.completion_tokens ?? 0;
    const parsedJson = request.expectJson ? parseJsonSafely(text) : undefined;

    return {
      text,
      parsedJson,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: payload.usage?.total_tokens ?? inputTokens + outputTokens,
      },
      latencyMs: Date.now() - started,
      providerRequestId: payload.id,
      modelId: request.modelId,
    };
  }

  async testConnection(
    credentials: AIProviderCredentials,
    timeoutMs = 10_000
  ): Promise<ConnectionTestResult> {
    const baseUrl = credentials.baseUrl
      ? validateSafeBaseUrl(credentials.baseUrl)
      : this.defaultBaseUrl;
    const started = Date.now();
    try {
      const res = await this.fetchFn(`${baseUrl}/models`, {
        method: "GET",
        headers: { Authorization: `Bearer ${credentials.apiKey}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        return {
          ok: false,
          latencyMs: Date.now() - started,
          message: `Provider returned HTTP ${res.status}`,
        };
      }
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      return {
        ok: true,
        latencyMs: Date.now() - started,
        message: "Connection verified successfully.",
        discoveredModels: (data.data ?? []).slice(0, 20).map((m) => m.id),
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        message: redactSecret(err instanceof Error ? err.message : "Connection failed", credentials.apiKey),
      };
    }
  }
}

export class GoogleGeminiAdapter implements AIProviderAdapter {
  public readonly providerType: AIProviderType = "google";
  private readonly fetchFn: FetchFn;

  constructor(fetchFn: FetchFn = fetch) {
    this.fetchFn = fetchFn;
  }

  async generate(
    request: AIGenerateRequest,
    credentials: AIProviderCredentials
  ): Promise<AIGenerateResponse> {
    const baseUrl = credentials.baseUrl
      ? validateSafeBaseUrl(credentials.baseUrl)
      : "https://generativelanguage.googleapis.com/v1beta";
    const started = Date.now();
    const timeoutMs = request.timeoutMs ?? 60_000;

    let response: Response;
    try {
      response = await this.fetchFn(
        `${baseUrl}/models/${encodeURIComponent(request.modelId)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": credentials.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: request.systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: request.userPrompt }] }],
            generationConfig: {
              temperature: request.temperature ?? 0.2,
              maxOutputTokens: request.maxTokens ?? 4096,
              ...(request.expectJson ? { responseMimeType: "application/json" } : {}),
            },
          }),
          signal: createTimeoutSignal(timeoutMs, request.signal),
        }
      );
    } catch (err) {
      const msg = redactSecret(err instanceof Error ? err.message : "Network error", credentials.apiKey);
      throw new ExternalProviderError(`Google Gemini request failed: ${msg}`, true);
    }

    if (!response.ok) {
      const rawErr = redactSecret((await response.text()).slice(0, 400), credentials.apiKey);
      throw new ExternalProviderError(
        `Google Gemini HTTP ${response.status}: ${rawErr}`,
        isRetryableHttpStatus(response.status)
      );
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const inputTokens = payload.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = payload.usageMetadata?.candidatesTokenCount ?? 0;

    return {
      text,
      parsedJson: request.expectJson ? parseJsonSafely(text) : undefined,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: payload.usageMetadata?.totalTokenCount ?? inputTokens + outputTokens,
      },
      latencyMs: Date.now() - started,
      modelId: request.modelId,
    };
  }

  async testConnection(
    credentials: AIProviderCredentials,
    timeoutMs = 10_000
  ): Promise<ConnectionTestResult> {
    const baseUrl = credentials.baseUrl
      ? validateSafeBaseUrl(credentials.baseUrl)
      : "https://generativelanguage.googleapis.com/v1beta";
    const started = Date.now();
    try {
      const res = await this.fetchFn(`${baseUrl}/models`, {
        method: "GET",
        headers: { "x-goog-api-key": credentials.apiKey },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        return {
          ok: false,
          latencyMs: Date.now() - started,
          message: `Google Gemini returned HTTP ${res.status}`,
        };
      }
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      return {
        ok: true,
        latencyMs: Date.now() - started,
        message: "Google Gemini connection verified.",
        discoveredModels: (data.models ?? []).slice(0, 20).map((m) => m.name.replace(/^models\//, "")),
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        message: redactSecret(err instanceof Error ? err.message : "Connection failed", credentials.apiKey),
      };
    }
  }
}

export class AnthropicAdapter implements AIProviderAdapter {
  public readonly providerType: AIProviderType = "anthropic";
  private readonly fetchFn: FetchFn;

  constructor(fetchFn: FetchFn = fetch) {
    this.fetchFn = fetchFn;
  }

  async generate(
    request: AIGenerateRequest,
    credentials: AIProviderCredentials
  ): Promise<AIGenerateResponse> {
    const baseUrl = credentials.baseUrl
      ? validateSafeBaseUrl(credentials.baseUrl)
      : "https://api.anthropic.com/v1";
    const started = Date.now();
    const timeoutMs = request.timeoutMs ?? 60_000;

    let response: Response;
    try {
      response = await this.fetchFn(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": credentials.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: request.modelId,
          max_tokens: request.maxTokens ?? 4096,
          temperature: request.temperature ?? 0.2,
          system: request.expectJson
            ? `${request.systemPrompt}\nReturn ONLY valid JSON matching the requested schema.`
            : request.systemPrompt,
          messages: [{ role: "user", content: request.userPrompt }],
        }),
        signal: createTimeoutSignal(timeoutMs, request.signal),
      });
    } catch (err) {
      const msg = redactSecret(err instanceof Error ? err.message : "Network error", credentials.apiKey);
      throw new ExternalProviderError(`Anthropic request failed: ${msg}`, true);
    }

    if (!response.ok) {
      const rawErr = redactSecret((await response.text()).slice(0, 400), credentials.apiKey);
      throw new ExternalProviderError(
        `Anthropic HTTP ${response.status}: ${rawErr}`,
        isRetryableHttpStatus(response.status)
      );
    }

    const payload = (await response.json()) as {
      id?: string;
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const text = (payload.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");
    const inputTokens = payload.usage?.input_tokens ?? 0;
    const outputTokens = payload.usage?.output_tokens ?? 0;

    return {
      text,
      parsedJson: request.expectJson ? parseJsonSafely(text) : undefined,
      usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
      latencyMs: Date.now() - started,
      providerRequestId: payload.id,
      modelId: request.modelId,
    };
  }

  async testConnection(
    credentials: AIProviderCredentials,
    timeoutMs = 10_000
  ): Promise<ConnectionTestResult> {
    const baseUrl = credentials.baseUrl
      ? validateSafeBaseUrl(credentials.baseUrl)
      : "https://api.anthropic.com/v1";
    const started = Date.now();
    try {
      const res = await this.fetchFn(`${baseUrl}/models`, {
        method: "GET",
        headers: {
          "x-api-key": credentials.apiKey,
          "anthropic-version": "2023-06-01",
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        return {
          ok: false,
          latencyMs: Date.now() - started,
          message: `Anthropic returned HTTP ${res.status}`,
        };
      }
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      return {
        ok: true,
        latencyMs: Date.now() - started,
        message: "Anthropic connection verified.",
        discoveredModels: (data.data ?? []).slice(0, 20).map((m) => m.id),
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        message: redactSecret(err instanceof Error ? err.message : "Connection failed", credentials.apiKey),
      };
    }
  }
}

export class AIProviderRegistry {
  private readonly adapters: Map<AIProviderType, AIProviderAdapter>;

  constructor(fetchFn: FetchFn = fetch) {
    this.adapters = new Map<AIProviderType, AIProviderAdapter>([
      ["openai", new OpenAICompatibleAdapter("openai", "https://api.openai.com/v1", fetchFn)],
      ["google", new GoogleGeminiAdapter(fetchFn)],
      ["anthropic", new AnthropicAdapter(fetchFn)],
      ["openai_compatible", new OpenAICompatibleAdapter("openai_compatible", "https://api.openai.com/v1", fetchFn)],
    ]);
  }

  get(providerType: AIProviderType): AIProviderAdapter {
    const adapter = this.adapters.get(providerType);
    if (!adapter) {
      throw new ValidationError(`Unsupported AI provider type: ${providerType}`);
    }
    return adapter;
  }

  register(adapter: AIProviderAdapter): void {
    this.adapters.set(adapter.providerType, adapter);
  }
}
