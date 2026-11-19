-- Migration 0005: Technical Artifacts (Architecture, Database Schema Designer, API Catalogue), Development Tasks & QA Test Cases

CREATE TABLE IF NOT EXISTS public.architecture_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  component_key TEXT NOT NULL,
  name TEXT NOT NULL,
  layer TEXT NOT NULL CHECK (layer IN ('client', 'edge', 'application', 'worker', 'data', 'external')),
  technology TEXT NOT NULL DEFAULT '',
  responsibility TEXT NOT NULL DEFAULT '',
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, component_key)
);

CREATE TABLE IF NOT EXISTS public.architecture_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_component_id UUID NOT NULL REFERENCES public.architecture_components(id) ON DELETE CASCADE,
  target_component_id UUID NOT NULL REFERENCES public.architecture_components(id) ON DELETE CASCADE,
  protocol TEXT NOT NULL DEFAULT 'HTTPS',
  label TEXT NOT NULL DEFAULT '',
  is_async BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_component_id <> target_component_id)
);

CREATE TABLE IF NOT EXISTS public.architecture_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  adr_key TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'deprecated', 'superseded')),
  context TEXT NOT NULL,
  decision TEXT NOT NULL,
  consequences TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, adr_key)
);

CREATE TABLE IF NOT EXISTS public.db_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL CHECK (table_name ~ '^[a-z][a-z0-9_]*$'),
  schema_name TEXT NOT NULL DEFAULT 'public',
  description TEXT NOT NULL DEFAULT '',
  rls_enabled BOOLEAN NOT NULL DEFAULT true,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, schema_name, table_name)
);

CREATE TABLE IF NOT EXISTS public.db_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.db_entities(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL CHECK (column_name ~ '^[a-z][a-z0-9_]*$'),
  data_type TEXT NOT NULL,
  is_primary_key BOOLEAN NOT NULL DEFAULT false,
  is_nullable BOOLEAN NOT NULL DEFAULT false,
  is_unique BOOLEAN NOT NULL DEFAULT false,
  default_value TEXT,
  description TEXT NOT NULL DEFAULT '',
  ordinal_position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, column_name)
);

CREATE TABLE IF NOT EXISTS public.db_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_entity_id UUID NOT NULL REFERENCES public.db_entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES public.db_entities(id) ON DELETE CASCADE,
  source_column TEXT NOT NULL,
  target_column TEXT NOT NULL DEFAULT 'id',
  cardinality TEXT NOT NULL DEFAULT 'many_to_one' CHECK (cardinality IN ('one_to_one', 'one_to_many', 'many_to_one', 'many_to_many')),
  on_delete TEXT NOT NULL DEFAULT 'RESTRICT' CHECK (on_delete IN ('CASCADE', 'RESTRICT', 'SET NULL', 'NO ACTION')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  endpoint_key TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  path TEXT NOT NULL CHECK (path LIKE '/%'),
  summary TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  auth_policy TEXT NOT NULL DEFAULT 'authenticated',
  request_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  status_codes JSONB NOT NULL DEFAULT '[200,400,401,403,404]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, method, path)
);

CREATE TABLE IF NOT EXISTS public.development_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'P01',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_role TEXT NOT NULL DEFAULT 'Full Stack',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  estimate_hours NUMERIC(8,2) NOT NULL DEFAULT 8 CHECK (estimate_hours > 0),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'blocked', 'in_review', 'done', 'deferred')),
  acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, task_key)
);

CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.development_tasks(id) ON DELETE CASCADE,
  dependency_task_id UUID NOT NULL REFERENCES public.development_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, dependency_task_id),
  CHECK (task_id <> dependency_task_id)
);

CREATE TABLE IF NOT EXISTS public.test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  test_key TEXT NOT NULL,
  area TEXT NOT NULL,
  title TEXT NOT NULL,
  preconditions TEXT NOT NULL DEFAULT '',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_result TEXT NOT NULL,
  test_type TEXT NOT NULL DEFAULT 'integration' CHECK (test_type IN ('unit', 'integration', 'api', 'e2e', 'security', 'accessibility', 'performance')),
  priority TEXT NOT NULL DEFAULT 'high' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'passing', 'failing', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, test_key)
);

CREATE INDEX IF NOT EXISTS idx_arch_components_project ON public.architecture_components(project_id);
CREATE INDEX IF NOT EXISTS idx_arch_relationships_project ON public.architecture_relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_arch_decisions_project ON public.architecture_decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_db_entities_project ON public.db_entities(project_id);
CREATE INDEX IF NOT EXISTS idx_db_attributes_entity ON public.db_attributes(entity_id, ordinal_position);
CREATE INDEX IF NOT EXISTS idx_db_relationships_project ON public.db_relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_project ON public.api_endpoints(project_id);
CREATE INDEX IF NOT EXISTS idx_development_tasks_project ON public.development_tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_project ON public.test_cases(project_id, status);
