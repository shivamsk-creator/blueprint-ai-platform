export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  requestId: string;
  code: string;
  errors?: Array<{ field: string; message: string }>;
}

export class DomainError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly type: string;
  public readonly title: string;
  public readonly errors?: Array<{ field: string; message: string }>;

  constructor(params: {
    status: number;
    code: string;
    title: string;
    detail: string;
    type?: string;
    errors?: Array<{ field: string; message: string }>;
  }) {
    super(params.detail);
    this.name = new.target.name;
    this.status = params.status;
    this.code = params.code;
    this.title = params.title;
    this.type = params.type ?? `https://blueprint-ai.dev/errors/${params.code.toLowerCase()}`;
    this.errors = params.errors;
  }

  toProblemDetails(requestId: string, instance?: string): ProblemDetails {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.message,
      instance,
      requestId,
      code: this.code,
      ...(this.errors ? { errors: this.errors } : {}),
    };
  }
}

export class ValidationError extends DomainError {
  constructor(detail: string, errors?: Array<{ field: string; message: string }>) {
    super({ status: 422, code: "VALIDATION_ERROR", title: "Validation Failed", detail, errors });
  }
}

export class UnauthorizedError extends DomainError {
  constructor(detail = "Authentication is required to access this resource.") {
    super({ status: 401, code: "UNAUTHORIZED", title: "Unauthorized", detail });
  }
}

export class ForbiddenError extends DomainError {
  constructor(detail = "You do not have permission to perform this action.") {
    super({ status: 403, code: "FORBIDDEN", title: "Forbidden", detail });
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super({
      status: 404,
      code: "NOT_FOUND",
      title: "Resource Not Found",
      detail: id ? `${entity} (${id}) was not found or is not accessible.` : `${entity} was not found.`,
    });
  }
}

export class ConflictError extends DomainError {
  constructor(detail: string) {
    super({ status: 409, code: "CONFLICT", title: "Conflict", detail });
  }
}

export class IncompatibleModelError extends DomainError {
  constructor(detail: string) {
    super({ status: 422, code: "INCOMPATIBLE_MODEL", title: "Incompatible AI Model", detail });
  }
}

export class RateLimitError extends DomainError {
  constructor(detail = "Rate limit exceeded. Please retry after a short pause.") {
    super({ status: 429, code: "RATE_LIMITED", title: "Too Many Requests", detail });
  }
}

export class ExternalProviderError extends DomainError {
  public readonly retryable: boolean;

  constructor(detail: string, retryable = true) {
    super({
      status: 502,
      code: "AI_PROVIDER_ERROR",
      title: "AI Provider Error",
      detail,
    });
    this.retryable = retryable;
  }
}
