import { redactSensitiveData } from "@blueprint/database";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export function logEvent(
  level: LogLevel,
  message: string,
  meta: Record<string, unknown> = {}
): void {
  const payload = {
    timestamp: new Date().toISOString(),
    service: "blueprint-web",
    level,
    message,
    ...redactSensitiveData(meta),
  };
  if (level === "ERROR") {
    console.error(JSON.stringify(payload));
  } else if (level === "WARN") {
    console.warn(JSON.stringify(payload));
  } else {
    console.info(JSON.stringify(payload));
  }
}
