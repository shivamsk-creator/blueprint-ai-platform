import http from "node:http";
import { parseWorkerEnv, isSupabaseConfigured } from "@blueprint/validation";
import {
  BlueprintRepository,
  createSupabaseServiceRoleClient,
  getBlueprintRepository,
  PgmqQueueClient,
  redactSensitiveData,
} from "@blueprint/database";
import { BlueprintJobProcessor } from "./processor";

function logJson(level: "INFO" | "WARN" | "ERROR", message: string, meta?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    service: "blueprint-worker",
    level,
    message,
    ...(meta ? redactSensitiveData(meta) : {}),
  };
  const stream = level === "ERROR" ? process.stderr : process.stdout;
  stream.write(`${JSON.stringify(entry)}\n`);
}

async function main(): Promise<void> {
  const env = parseWorkerEnv(process.env);
  let repo: BlueprintRepository;

  if (isSupabaseConfigured(env) && env.SUPABASE_SERVICE_ROLE_KEY) {
    const serviceClient = createSupabaseServiceRoleClient();
    const pgmq = new PgmqQueueClient(serviceClient);
    repo = new BlueprintRepository(undefined, pgmq);
    logJson("INFO", "Worker initialized in Supabase pgmq mode", {
      concurrency: env.WORKER_CONCURRENCY,
      pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
    });
  } else {
    repo = getBlueprintRepository();
    logJson("WARN", "Supabase service credentials absent; worker running in local development queue mode", {
      concurrency: env.WORKER_CONCURRENCY,
      pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
    });
  }

  const processor = new BlueprintJobProcessor(repo, {
    providerTimeoutMs: env.AI_PROVIDER_TIMEOUT_MS,
  });

  let shuttingDown = false;
  let lastPollAt = new Date().toISOString();
  let processedTotal = 0;

  // Lightweight liveness/readiness HTTP server for container/process orchestrators (D-014)
  const server = http.createServer((req, res) => {
    if (req.url === "/healthz" || req.url === "/readyz") {
      res.writeHead(shuttingDown ? 503 : 200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: shuttingDown ? "draining" : "ok",
          service: "blueprint-worker",
          lastPollAt,
          processedTotal,
        })
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.listen(env.WORKER_HEALTH_PORT, () => {
    logJson("INFO", "Worker health endpoint listening", { port: env.WORKER_HEALTH_PORT });
  });

  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logJson("INFO", "Received shutdown signal; draining worker loop", { signal });
    server.close();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  while (!shuttingDown) {
    try {
      const handled = await processor.pollOnce(env.WORKER_CONCURRENCY, 120);
      lastPollAt = new Date().toISOString();
      if (handled > 0) {
        processedTotal += handled;
        logJson("INFO", "Processed job batch", { count: handled, processedTotal });
      }
    } catch (err) {
      logJson("ERROR", "Worker poll cycle error", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    await new Promise((resolve) => setTimeout(resolve, env.WORKER_POLL_INTERVAL_MS));
  }

  logJson("INFO", "Worker shutdown complete");
}

// Only auto-start when executed directly as the worker entrypoint
const isMain = process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("index.js");
if (isMain) {
  void main();
}

export { BlueprintJobProcessor } from "./processor";
export { renderBlueprintExport } from "./exporters";
export { computeBackoffDelaySeconds, isTransientJobError } from "./retry";
