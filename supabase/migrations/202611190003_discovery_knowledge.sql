-- Migration 0003: Discovery Sessions, Clarification Q&A, Knowledge Repository & Research Provenance

CREATE TABLE IF NOT EXISTS public.discovery_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  brief_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clarification_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.discovery_sessions(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'functional',
  question_text TEXT NOT NULL,
  rationale TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'deferred', 'dismissed')),
  source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'user')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clarification_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.clarification_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_deferral BOOLEAN NOT NULL DEFAULT false,
  deferral_reason TEXT,
  provenance TEXT NOT NULL DEFAULT 'manual' CHECK (provenance IN ('manual', 'stakeholder_interview', 'document', 'decision')),
  answered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requirement_key TEXT NOT NULL,
  requirement_type TEXT NOT NULL CHECK (
    requirement_type IN ('functional', 'non_functional', 'business', 'technical')
  ),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'rejected', 'deferred')),
  acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (
    source_type IN ('brief', 'upload', 'interview', 'decision', 'research', 'manual')
  ),
  source_ref_id UUID,
  current_version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, requirement_key)
);

CREATE TABLE IF NOT EXISTS public.requirement_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL CHECK (version_no > 0),
  snapshot JSONB NOT NULL,
  change_summary TEXT NOT NULL DEFAULT '',
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requirement_id, version_no)
);

CREATE TABLE IF NOT EXISTS public.assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assumption_key TEXT NOT NULL,
  statement TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'validated', 'invalidated')),
  impact_if_false TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, assumption_key)
);

CREATE TABLE IF NOT EXISTS public.constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  constraint_key TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('business', 'technical', 'operational', 'regulatory', 'budget', 'timeline')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, constraint_key)
);

CREATE TABLE IF NOT EXISTS public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  decision_key TEXT NOT NULL,
  title TEXT NOT NULL,
  context TEXT NOT NULL,
  decision_statement TEXT NOT NULL,
  rationale TEXT NOT NULL,
  alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'superseded', 'rejected')),
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, decision_key)
);

CREATE TABLE IF NOT EXISTS public.research_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('web', 'uploaded_file', 'interview', 'benchmark', 'internal_doc')),
  url TEXT,
  file_id UUID REFERENCES public.project_files(id) ON DELETE SET NULL,
  author_or_publisher TEXT,
  published_at TIMESTAMPTZ,
  captured_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.research_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.research_sources(id) ON DELETE CASCADE,
  excerpt TEXT NOT NULL,
  claim_summary TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  linked_entity_type public.entity_type,
  linked_entity_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discovery_sessions_project ON public.discovery_sessions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clarification_questions_session ON public.clarification_questions(session_id, status);
CREATE INDEX IF NOT EXISTS idx_clarification_answers_question ON public.clarification_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_requirements_project_status ON public.requirements(project_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_requirement_revisions_req ON public.requirement_revisions(requirement_id, version_no DESC);
CREATE INDEX IF NOT EXISTS idx_assumptions_project ON public.assumptions(project_id);
CREATE INDEX IF NOT EXISTS idx_constraints_project ON public.constraints(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project ON public.decisions(project_id, status);
CREATE INDEX IF NOT EXISTS idx_research_sources_project ON public.research_sources(project_id);
CREATE INDEX IF NOT EXISTS idx_research_evidence_source ON public.research_evidence(source_id);
