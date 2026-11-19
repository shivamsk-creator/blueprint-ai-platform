-- Migration 0007: AI Providers, Server-Only Encrypted Secrets, Models, Task Policies, Async Jobs, Usage & pgmq Queues

CREATE TABLE IF NOT EXISTS public.ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (
    provider_type IN ('openai', 'google', 'anthropic', 'openai_compatible')
  ),
  display_name TEXT NOT NULL,
  base_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  key_hint TEXT NOT NULL DEFAULT '',
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT CHECK (last_test_status IN ('ok', 'error')),
  last_test_error TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Server-only encrypted secrets table: ZERO client/browser SELECT policies permitted
CREATE TABLE IF NOT EXISTS public.ai_provider_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL UNIQUE REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  secret_ciphertext_or_ref TEXT NOT NULL,
  key_version TEXT NOT NULL DEFAULT 'v1',
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  input_cost_per_1m_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  output_cost_per_1m_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, model_id)
);

CREATE TABLE IF NOT EXISTS public.ai_task_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (
    task_type IN (
      'requirement_analysis', 'clarification_generation', 'research_synthesis',
      'brd_generation', 'prd_generation', 'scope_recommendation',
      'ux_spec_generation', 'architecture_generation', 'database_generation',
      'api_generation', 'development_breakdown', 'qa_generation',
      'consistency_validation', 'change_impact', 'export_rendering'
    )
  ),
  default_model_id UUID REFERENCES public.ai_models(id) ON DELETE SET NULL,
  fallback_model_id UUID REFERENCES public.ai_models(id) ON DELETE SET NULL,
  allowed_model_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  allow_user_override BOOLEAN NOT NULL DEFAULT true,
  max_tokens INTEGER NOT NULL DEFAULT 8192 CHECK (max_tokens > 0),
  monthly_budget_usd NUMERIC(12,4),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, task_type)
);

CREATE TABLE IF NOT EXISTS public.ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (
    job_type IN (
      'ai.generate_artifact', 'ai.regenerate_section', 'discovery.analyze',
      'validation.run', 'research.synthesize', 'export.generate', 'usage.reconcile'
    )
  ),
  task_type TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')
  ),
  resolved_provider_id UUID REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  resolved_model_id TEXT,
  was_user_override BOOLEAN NOT NULL DEFAULT false,
  input_payload JSONB NOT NULL,
  result_payload JSONB,
  error_code TEXT,
  error_message TEXT,
  idempotency_key TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  pgmq_msg_id BIGINT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.ai_job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.ai_jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  progress_pct INTEGER CHECK (progress_pct >= 0 AND progress_pct <= 100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.ai_jobs(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  model_id TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  estimated_cost_usd NUMERIC(19,6) NOT NULL DEFAULT 0,
  actual_cost_usd NUMERIC(19,6),
  latency_ms INTEGER NOT NULL DEFAULT 0,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link export_files.job_id and artifact_revisions.ai_job_id now that ai_jobs exists
ALTER TABLE public.export_files
  ADD CONSTRAINT fk_export_files_job
  FOREIGN KEY (job_id) REFERENCES public.ai_jobs(id) ON DELETE SET NULL;

ALTER TABLE public.artifact_revisions
  ADD CONSTRAINT fk_artifact_revisions_ai_job
  FOREIGN KEY (ai_job_id) REFERENCES public.ai_jobs(id) ON DELETE SET NULL;

ALTER TABLE public.validation_runs
  ADD CONSTRAINT fk_validation_runs_ai_job
  FOREIGN KEY (ai_job_id) REFERENCES public.ai_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_providers_workspace ON public.ai_providers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_workspace_provider ON public.ai_models(workspace_id, provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_task_policies_workspace ON public.ai_task_policies(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_workspace_status ON public.ai_jobs(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_project ON public.ai_jobs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_job_events_job ON public.ai_job_events(job_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace_created ON public.ai_usage_records(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_project ON public.ai_usage_records(project_id, created_at DESC);

-- Create durable Supabase Queues (pgmq) queues for worker processing and dead-letter archival
SELECT pgmq.create('blueprint_jobs');
SELECT pgmq.create('blueprint_jobs_dlq');

-- Server-only RPC wrappers so the worker/Next.js server can interact with pgmq over Supabase RPC
CREATE OR REPLACE FUNCTION public.blueprint_queue_enqueue(
  p_queue_name TEXT,
  p_message JSONB,
  p_delay_seconds INTEGER DEFAULT 0
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE
  v_msg_id BIGINT;
BEGIN
  IF p_queue_name NOT IN ('blueprint_jobs', 'blueprint_jobs_dlq') THEN
    RAISE EXCEPTION 'Invalid queue name: %', p_queue_name;
  END IF;
  SELECT pgmq.send(p_queue_name, p_message, p_delay_seconds) INTO v_msg_id;
  RETURN v_msg_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.blueprint_queue_read(
  p_queue_name TEXT,
  p_vt_seconds INTEGER DEFAULT 120,
  p_qty INTEGER DEFAULT 4
)
RETURNS TABLE (
  msg_id BIGINT,
  read_ct INTEGER,
  enqueued_at TIMESTAMPTZ,
  vt TIMESTAMPTZ,
  message JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  IF p_queue_name NOT IN ('blueprint_jobs', 'blueprint_jobs_dlq') THEN
    RAISE EXCEPTION 'Invalid queue name: %', p_queue_name;
  END IF;
  RETURN QUERY SELECT * FROM pgmq.read(p_queue_name, p_vt_seconds, p_qty);
END;
$$;

CREATE OR REPLACE FUNCTION public.blueprint_queue_archive(
  p_queue_name TEXT,
  p_msg_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  IF p_queue_name NOT IN ('blueprint_jobs', 'blueprint_jobs_dlq') THEN
    RAISE EXCEPTION 'Invalid queue name: %', p_queue_name;
  END IF;
  RETURN pgmq.archive(p_queue_name, p_msg_id);
END;
$$;

-- Restrict queue RPC execution to service_role only
REVOKE ALL ON FUNCTION public.blueprint_queue_enqueue(TEXT, JSONB, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.blueprint_queue_read(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.blueprint_queue_archive(TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.blueprint_queue_enqueue(TEXT, JSONB, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.blueprint_queue_read(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.blueprint_queue_archive(TEXT, BIGINT) TO service_role;
