-- Migration 0008: Row-Level Security (RLS) across ALL 52 tables + Private Storage Policies

-- Helper security-definer functions for zero-recursion tenant & RBAC evaluation
CREATE OR REPLACE FUNCTION public.bp_workspace_role(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.bp_is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.bp_is_workspace_admin(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.bp_can_access_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.workspace_members wm
      ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
    WHERE p.id = p_project_id
      AND (
        p.restricted_access = false
        OR wm.role IN ('owner', 'admin')
        OR EXISTS (
          SELECT 1 FROM public.project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.bp_can_contribute_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.workspace_members wm
      ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
    LEFT JOIN public.project_members pm
      ON pm.project_id = p.id AND pm.user_id = auth.uid()
    WHERE p.id = p_project_id
      AND COALESCE(pm.role, wm.role) IN ('owner', 'admin', 'manager', 'contributor')
      AND (p.restricted_access = false OR wm.role IN ('owner', 'admin') OR pm.id IS NOT NULL)
  );
$$;

CREATE OR REPLACE FUNCTION public.bp_can_review_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.workspace_members wm
      ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
    LEFT JOIN public.project_members pm
      ON pm.project_id = p.id AND pm.user_id = auth.uid()
    WHERE p.id = p_project_id
      AND COALESCE(pm.role, wm.role) IN ('owner', 'admin', 'manager', 'reviewer')
      AND (p.restricted_access = false OR wm.role IN ('owner', 'admin') OR pm.id IS NOT NULL)
  );
$$;

CREATE OR REPLACE FUNCTION public.bp_can_manage_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.workspace_members wm
      ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
    LEFT JOIN public.project_members pm
      ON pm.project_id = p.id AND pm.user_id = auth.uid()
    WHERE p.id = p_project_id
      AND COALESCE(pm.role, wm.role) IN ('owner', 'admin', 'manager')
  );
$$;

-- Enable RLS on ALL 52 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clarification_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clarification_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ux_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.development_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traceability_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_files ENABLE ROW LEVEL SECURITY;

-- 1. profiles: self or co-member of shared workspace; update self only
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm1
      JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
    )
  );
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 2. workspaces
CREATE POLICY workspaces_select ON public.workspaces FOR SELECT TO authenticated
  USING (public.bp_is_workspace_member(id));
CREATE POLICY workspaces_insert ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY workspaces_update ON public.workspaces FOR UPDATE TO authenticated
  USING (public.bp_is_workspace_admin(id)) WITH CHECK (public.bp_is_workspace_admin(id));

-- 3. workspace_members (prevent direct role escalation)
CREATE POLICY workspace_members_select ON public.workspace_members FOR SELECT TO authenticated
  USING (public.bp_is_workspace_member(workspace_id));
CREATE POLICY workspace_members_admin_insert ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (public.bp_is_workspace_admin(workspace_id));
CREATE POLICY workspace_members_admin_update ON public.workspace_members FOR UPDATE TO authenticated
  USING (public.bp_is_workspace_admin(workspace_id) AND user_id <> auth.uid())
  WITH CHECK (public.bp_is_workspace_admin(workspace_id) AND role <> 'owner');
CREATE POLICY workspace_members_delete ON public.workspace_members FOR DELETE TO authenticated
  USING (public.bp_is_workspace_admin(workspace_id) OR user_id = auth.uid());

-- 4. workspace_invitations
CREATE POLICY workspace_invitations_admin_all ON public.workspace_invitations FOR ALL TO authenticated
  USING (public.bp_is_workspace_admin(workspace_id))
  WITH CHECK (public.bp_is_workspace_admin(workspace_id));

-- 5. projects & project_members
CREATE POLICY projects_select ON public.projects FOR SELECT TO authenticated
  USING (public.bp_can_access_project(id));
CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated
  WITH CHECK (
    public.bp_workspace_role(workspace_id) IN ('owner', 'admin', 'manager', 'contributor')
    AND created_by = auth.uid()
  );
CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated
  USING (public.bp_can_manage_project(id))
  WITH CHECK (public.bp_can_manage_project(id));

CREATE POLICY project_members_select ON public.project_members FOR SELECT TO authenticated
  USING (public.bp_can_access_project(project_id));
CREATE POLICY project_members_manage ON public.project_members FOR ALL TO authenticated
  USING (public.bp_can_manage_project(project_id))
  WITH CHECK (public.bp_can_manage_project(project_id));

-- 6. Project-scoped tables (SELECT for project members; INSERT/UPDATE for contributors+)
DO $$
DECLARE
  tbl TEXT;
  project_tables TEXT[] := ARRAY[
    'project_stages', 'project_files', 'discovery_sessions',
    'clarification_questions', 'clarification_answers',
    'requirements', 'requirement_revisions', 'assumptions', 'constraints',
    'decisions', 'research_sources', 'research_evidence',
    'artifacts', 'artifact_revisions', 'artifact_sections', 'artifact_comments',
    'features', 'ux_personas', 'user_journeys', 'screen_specs',
    'architecture_components', 'architecture_relationships', 'architecture_decisions',
    'db_entities', 'db_attributes', 'db_relationships',
    'api_endpoints', 'development_tasks', 'task_dependencies', 'test_cases',
    'traceability_links', 'validation_runs', 'validation_issues',
    'change_requests', 'change_impacts'
  ];
BEGIN
  FOREACH tbl IN ARRAY project_tables LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.bp_can_access_project(project_id));',
      tbl || '_select', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.bp_can_contribute_project(project_id));',
      tbl || '_insert', tbl
    );
    IF tbl NOT IN ('artifact_revisions', 'requirement_revisions') THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.bp_can_contribute_project(project_id)) WITH CHECK (public.bp_can_contribute_project(project_id));',
        tbl || '_update', tbl
      );
    END IF;
  END LOOP;
END $$;

-- 7. approvals: project members view; reviewers/managers/admins/owners insert
CREATE POLICY approvals_select ON public.approvals FOR SELECT TO authenticated
  USING (public.bp_can_access_project(project_id));
CREATE POLICY approvals_insert ON public.approvals FOR INSERT TO authenticated
  WITH CHECK (public.bp_can_review_project(project_id) AND reviewer_id = auth.uid());

-- 8. ai_providers (metadata only, workspace admins only)
CREATE POLICY ai_providers_admin_select ON public.ai_providers FOR SELECT TO authenticated
  USING (public.bp_is_workspace_admin(workspace_id));
CREATE POLICY ai_providers_admin_write ON public.ai_providers FOR ALL TO authenticated
  USING (public.bp_is_workspace_admin(workspace_id))
  WITH CHECK (public.bp_is_workspace_admin(workspace_id));

-- 9. ai_provider_secrets: STRICTLY SERVER-ONLY (service_role bypasses RLS; zero authenticated/anon policies)
REVOKE ALL ON public.ai_provider_secrets FROM anon, authenticated;

-- 10. ai_models & ai_task_policies: workspace members read; admins write
CREATE POLICY ai_models_member_select ON public.ai_models FOR SELECT TO authenticated
  USING (public.bp_is_workspace_member(workspace_id));
CREATE POLICY ai_models_admin_write ON public.ai_models FOR ALL TO authenticated
  USING (public.bp_is_workspace_admin(workspace_id))
  WITH CHECK (public.bp_is_workspace_admin(workspace_id));

CREATE POLICY ai_task_policies_member_select ON public.ai_task_policies FOR SELECT TO authenticated
  USING (public.bp_is_workspace_member(workspace_id));
CREATE POLICY ai_task_policies_admin_write ON public.ai_task_policies FOR ALL TO authenticated
  USING (public.bp_is_workspace_admin(workspace_id))
  WITH CHECK (public.bp_is_workspace_admin(workspace_id));

-- 11. ai_jobs & ai_job_events
CREATE POLICY ai_jobs_select ON public.ai_jobs FOR SELECT TO authenticated
  USING (public.bp_can_access_project(project_id));
CREATE POLICY ai_jobs_insert ON public.ai_jobs FOR INSERT TO authenticated
  WITH CHECK (public.bp_can_contribute_project(project_id) AND requested_by = auth.uid());
CREATE POLICY ai_jobs_cancel ON public.ai_jobs FOR UPDATE TO authenticated
  USING (requested_by = auth.uid() OR public.bp_can_manage_project(project_id))
  WITH CHECK (status = 'cancelled');

CREATE POLICY ai_job_events_select ON public.ai_job_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_jobs j
      WHERE j.id = ai_job_events.job_id AND public.bp_can_access_project(j.project_id)
    )
  );

-- 12. ai_usage_records: workspace admin or own actor; server-only writes
CREATE POLICY ai_usage_select ON public.ai_usage_records FOR SELECT TO authenticated
  USING (public.bp_is_workspace_admin(workspace_id) OR actor_user_id = auth.uid());

-- 13. audit_logs: append-only, workspace admin read, server inserts only
CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT TO authenticated
  USING (public.bp_is_workspace_admin(workspace_id) OR actor_user_id = auth.uid());

-- 14. notifications: self only
CREATE POLICY notifications_select_self ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY notifications_update_self ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 15. export_files: project members read; server creates/updates metadata
CREATE POLICY export_files_select ON public.export_files FOR SELECT TO authenticated
  USING (public.bp_can_access_project(project_id));

-- Private Storage Buckets & Path-Scoped RLS (path convention: <workspace_id>/<project_id>/<filename>)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false),
       ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY storage_project_files_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-files'
    AND public.bp_can_access_project((string_to_array(name, '/'))[2]::uuid)
  );

CREATE POLICY storage_project_files_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-files'
    AND public.bp_can_contribute_project((string_to_array(name, '/'))[2]::uuid)
  );

CREATE POLICY storage_exports_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'exports'
    AND public.bp_can_access_project((string_to_array(name, '/'))[2]::uuid)
  );
