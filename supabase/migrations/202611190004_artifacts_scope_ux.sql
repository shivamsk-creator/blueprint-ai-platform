-- Migration 0004: Artifacts, Immutable Revisions, Sections, Comments, MVP Scope & UX Specs

CREATE TABLE IF NOT EXISTS public.artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL CHECK (
    artifact_type IN (
      'brd', 'prd', 'mvp_scope', 'ux_spec', 'architecture',
      'database', 'api', 'dev_plan', 'qa_plan'
    )
  ),
  title TEXT NOT NULL,
  current_revision_id UUID,
  needs_review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, artifact_type)
);

CREATE TABLE IF NOT EXISTS public.artifact_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL CHECK (version_no > 0),
  content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'in_review', 'approved', 'rejected', 'superseded')
  ),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai_generated', 'ai_section_regen', 'import')),
  base_revision_id UUID REFERENCES public.artifact_revisions(id) ON DELETE SET NULL,
  change_summary TEXT NOT NULL DEFAULT '',
  ai_job_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artifact_id, version_no)
);

ALTER TABLE public.artifacts
  ADD CONSTRAINT fk_artifacts_current_revision
  FOREIGN KEY (current_revision_id)
  REFERENCES public.artifact_revisions(id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.artifact_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  revision_id UUID NOT NULL REFERENCES public.artifact_revisions(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  heading TEXT NOT NULL,
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  body_markdown TEXT NOT NULL DEFAULT '',
  structured_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (revision_id, section_key)
);

CREATE TABLE IF NOT EXISTS public.artifact_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  revision_id UUID NOT NULL REFERENCES public.artifact_revisions(id) ON DELETE CASCADE,
  section_key TEXT,
  body TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  scope_bucket TEXT NOT NULL DEFAULT 'mvp' CHECK (scope_bucket IN ('mvp', 'phase_2', 'deferred', 'excluded')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  effort_estimate TEXT NOT NULL DEFAULT 'M' CHECK (effort_estimate IN ('XS', 'S', 'M', 'L', 'XL')),
  rationale TEXT NOT NULL DEFAULT '',
  acceptance_summary TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.ux_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_label TEXT NOT NULL,
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  pain_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical_proficiency TEXT NOT NULL DEFAULT 'intermediate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES public.ux_personas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  success_criteria TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.screen_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  screen_key TEXT NOT NULL,
  name TEXT NOT NULL,
  route_path TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT '',
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  interactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  states JSONB NOT NULL DEFAULT '{"loading":true,"empty":true,"error":true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, screen_key)
);

CREATE INDEX IF NOT EXISTS idx_artifacts_project ON public.artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_artifact_revisions_artifact ON public.artifact_revisions(artifact_id, version_no DESC);
CREATE INDEX IF NOT EXISTS idx_artifact_sections_revision ON public.artifact_sections(revision_id, order_index);
CREATE INDEX IF NOT EXISTS idx_artifact_comments_revision ON public.artifact_comments(revision_id);
CREATE INDEX IF NOT EXISTS idx_features_project_bucket ON public.features(project_id, scope_bucket);
CREATE INDEX IF NOT EXISTS idx_ux_personas_project ON public.ux_personas(project_id);
CREATE INDEX IF NOT EXISTS idx_user_journeys_project ON public.user_journeys(project_id);
CREATE INDEX IF NOT EXISTS idx_screen_specs_project ON public.screen_specs(project_id);
