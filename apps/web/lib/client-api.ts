import type { AIJob, ProblemDetails } from "@blueprint/domain";

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId?: string;
  public readonly fieldErrors?: Array<{ field: string; message: string }>;

  constructor(problem: Partial<ProblemDetails>, fallbackStatus: number) {
    super(problem.detail || problem.title || `Request failed (${fallbackStatus})`);
    this.name = "ApiClientError";
    this.status = problem.status ?? fallbackStatus;
    this.code = problem.code ?? "API_ERROR";
    this.requestId = problem.requestId;
    this.fieldErrors = problem.errors;
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let body: Partial<ProblemDetails> = {};
    try {
      body = (await response.json()) as Partial<ProblemDetails>;
    } catch {
      body = { detail: response.statusText };
    }
    throw new ApiClientError(body, response.status);
  }

  return (await response.json()) as T;
}

/**
 * Polls an async job until terminal state (`succeeded` | `failed` | `cancelled`).
 * Provides reconnect-safe recovery alongside Supabase Realtime (D-010).
 */
export async function pollJobUntilComplete(
  jobId: string,
  onUpdate: (job: AIJob) => void,
  maxWaitMs = 30_000
): Promise<AIJob> {
  const started = Date.now();
  let delayMs = 350;

  while (Date.now() - started < maxWaitMs) {
    const { job } = await apiFetch<{ job: AIJob }>(`/api/ai-jobs/${jobId}`);
    onUpdate(job);
    if (job.status === "succeeded" || job.status === "failed" || job.status === "cancelled") {
      return job;
    }
    await new Promise((r) => setTimeout(r, delayMs));
    delayMs = Math.min(2000, Math.round(delayMs * 1.4));
  }

  const { job } = await apiFetch<{ job: AIJob }>(`/api/ai-jobs/${jobId}`);
  onUpdate(job);
  return job;
}
