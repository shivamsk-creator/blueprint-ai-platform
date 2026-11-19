-- Migration 0006: Traceability, Validation, Change Management, Approvals, Audit Logs, Notifications & Exports

CREATE TABLE IF NOT EXISTS public.traceability_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_type public.entity_type NOT NULL,
  source_id UUID NOT NULL,
  target_type public.entity_type NOT NULL,
  target_id UUID NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'implements' CHECK (
    relation_type IN ('derives_from', 'implements', 'verifies', 'depends_on', 'impacts', 'references')
  ),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, source_type, source_id, target_type, target_id, relation_type)
);

CREATE TABLE IF NOT EXISTS public.validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  blocker_count INTEGER NOT NULL DEFAULT 0,
  high_count INTEGER NOT NULL DEFAULT 0,
  medium_count INTEGER NOT NULL DEFAULT 0,
  low_count INTEGER NOT NULL DEFAULT 0,
  ai_job_id UUID,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.validation_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  validation_run_id UUID NOT NULL REFERENCES public.validation_runs(id) ON DELETE CASCADE,
  rule_code TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('blocker', 'high', 'medium', 'low', 'info')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT NOT NULL DEFAULT '',
  entity_type public.entity_type,
  entity_id UUID,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  change_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'impact_review', 'approved', 'rejected', 'applied')
  ),
  source_entity_type public.entity_type,
  source_entity_id UUID,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, change_key)
);

CREATE TABLE IF NOT EXISTS public.change_impacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  change_request_id UUID NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
  affected_entity_type public.entity_type NOT NULL,
  affected_entity_id UUID NOT NULL,
  impact_severity TEXT NOT NULL DEFAULT 'medium' CHECK (impact_severity IN ('blocker', 'high', 'medium', 'low')),
  rationale TEXT NOT NULL,
  reviewed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  target_revision_id UUID NOT NULL REFERENCES public.artifact_revisions(id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'changes_requested', 'rejected')),
  comment TEXT NOT NULL DEFAULT '',
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_path TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.export_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  job_id UUID,
  format TEXT NOT NULL CHECK (format IN ('pdf', 'docx', 'markdown', 'json', 'sql', 'openapi')),
  artifact_revision_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT,
  storage_bucket TEXT NOT NULL DEFAULT 'exports',
  storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  error_message TEXT,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_traceability_project_source ON public.traceability_links(project_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_traceability_project_target ON public.traceability_links(project_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_validation_runs_project ON public.validation_runs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_issues_run ON public.validation_issues(validation_run_id, severity);
CREATE INDEX IF NOT EXISTS idx_change_requests_project ON public.change_requests(project_id, status);
CREATE INDEX IF NOT EXISTS idx_change_impacts_request ON public.change_impacts(change_request_id);
CREATE INDEX IF NOT EXISTS idx_approvals_revision ON public.approvals(target_revision_id);
CREATE INDEX IF NOT EXISTS idx_approvals_project ON public.approvals(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON public.audit_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_files_project ON public.export_files(project_id, created_at DESC);
