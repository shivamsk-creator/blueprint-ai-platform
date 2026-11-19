import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError, type ZodTypeAny } from "zod";
import { DomainError, RateLimitError, ValidationError } from "@blueprint/domain";
import { logEvent } from "./logger";

// Sliding-window in-memory rate limiter for auth & sensitive endpoints
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function enforceRateLimit(key: string, maxRequests = 60, windowMs = 60_000): void {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > maxRequests) {
    throw new RateLimitError();
  }
}

export async function parseJsonBody<S extends ZodTypeAny>(
  request: Request,
  schema: S
): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(
      "Input validation failed.",
      parsed.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      }))
    );
  }
  return parsed.data;
}

export function jsonOk<T>(data: T, status = 200, requestId?: string): NextResponse {
  const headers: Record<string, string> = {};
  if (requestId) headers["x-request-id"] = requestId;
  return NextResponse.json(data, { status, headers });
}

export function problemResponse(
  err: unknown,
  requestId: string,
  instance: string
): NextResponse {
  if (err instanceof DomainError) {
    const problem = err.toProblemDetails(requestId, instance);
    return NextResponse.json(problem, {
      status: err.status,
      headers: {
        "content-type": "application/problem+json",
        "x-request-id": requestId,
      },
    });
  }

  if (err instanceof ZodError) {
    const validationErr = new ValidationError(
      "Input validation failed.",
      err.issues.map((i) => ({ field: i.path.join(".") || "body", message: i.message }))
    );
    return NextResponse.json(validationErr.toProblemDetails(requestId, instance), {
      status: 422,
      headers: {
        "content-type": "application/problem+json",
        "x-request-id": requestId,
      },
    });
  }

  logEvent("ERROR", "Unhandled API exception", {
    requestId,
    instance,
    errorName: err instanceof Error ? err.name : typeof err,
    errorMessage: err instanceof Error ? err.message : String(err),
  });

  // Never leak stack traces or internal SQL details to clients
  return NextResponse.json(
    {
      type: "https://blueprint-ai.dev/errors/internal_error",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred while processing the request.",
      instance,
      requestId,
      code: "INTERNAL_ERROR",
    },
    {
      status: 500,
      headers: {
        "content-type": "application/problem+json",
        "x-request-id": requestId,
      },
    }
  );
}

export async function handleApiRoute(
  request: NextRequest | Request,
  handler: (ctx: { requestId: string }) => Promise<Response>
): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const started = Date.now();
  const url = new URL(request.url);

  try {
    const response = await handler({ requestId });
    logEvent("INFO", `${request.method} ${url.pathname}`, {
      requestId,
      status: response.status,
      latencyMs: Date.now() - started,
    });
    return response;
  } catch (err) {
    const response = problemResponse(err, requestId, url.pathname);
    logEvent(response.status >= 500 ? "ERROR" : "WARN", `${request.method} ${url.pathname}`, {
      requestId,
      status: response.status,
      latencyMs: Date.now() - started,
    });
    return response;
  }
}
