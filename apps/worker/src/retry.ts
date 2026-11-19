import { DomainError, ExternalProviderError } from "@blueprint/domain";

export function computeBackoffDelaySeconds(
  attempt: number,
  baseSeconds = 2,
  maxSeconds = 120,
  randomFn: () => number = Math.random
): number {
  const exp = Math.min(maxSeconds, baseSeconds * Math.pow(2, Math.max(0, attempt - 1)));
  // Decorrelated jitter between 50% and 100% of exponential ceiling
  const jittered = exp * (0.5 + randomFn() * 0.5);
  return Math.max(1, Math.round(jittered));
}

export function isTransientJobError(err: unknown): boolean {
  if (err instanceof ExternalProviderError) {
    return err.retryable;
  }
  if (err instanceof DomainError) {
    return err.status === 408 || err.status === 429 || err.status >= 500;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("timeout") ||
      msg.includes("abort") ||
      msg.includes("econnreset") ||
      msg.includes("etimedout") ||
      msg.includes("fetch failed") ||
      msg.includes("rate limit") ||
      msg.includes("429") ||
      msg.includes("503")
    );
  }
  return false;
}
