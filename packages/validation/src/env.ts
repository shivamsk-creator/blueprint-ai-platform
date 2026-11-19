import { z } from "zod";

export const webEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().or(z.literal("")),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal("")),
  DATABASE_URL: z.string().optional().or(z.literal("")),
  AI_SECRETS_ENCRYPTION_KEY: z.string().optional().or(z.literal("")),
  AI_SECRETS_KEY_VERSION: z.string().min(1).default("v1"),
  AI_SECRETS_LEGACY_KEYS: z.string().optional().or(z.literal("")),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AI_PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300000).default(60000),
  STORAGE_BUCKET_PROJECT_FILES: z.string().min(1).default("project-files"),
  STORAGE_BUCKET_EXPORTS: z.string().min(1).default("exports"),
  SENTRY_DSN: z.string().optional().or(z.literal("")),
  BLUEPRINT_DEMO_MODE: z.string().optional(),
});

export const workerEnvSchema = webEnvSchema.extend({
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(250).max(60000).default(2000),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(4),
  WORKER_HEALTH_PORT: z.coerce.number().int().min(1024).max(65535).default(4001),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function parseWebEnv(env: Record<string, string | undefined> = process.env): WebEnv {
  return webEnvSchema.parse(env);
}

export function parseWorkerEnv(env: Record<string, string | undefined> = process.env): WorkerEnv {
  return workerEnvSchema.parse(env);
}

export function isSupabaseConfigured(env: Pick<WebEnv, "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY">): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !env.NEXT_PUBLIC_SUPABASE_URL.includes("example.supabase.co")
  );
}
