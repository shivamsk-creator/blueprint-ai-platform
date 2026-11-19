-- Migration 0009: Triggers for Audit Immutability, Revision Locking, Same-Project Traceability & Auto-Seeding

-- 1. Generic updated_at maintenance
CREATE OR REPLACE FUNCTION public.bp_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 2. Enforce immutable approved artifact revisions (cannot mutate content/version once created; approved cannot revert)
CREATE OR REPLACE FUNCTION public.bp_guard_artifact_revision_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'artifact_revisions are immutable and cannot be deleted';
  END IF;
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.version_no IS DISTINCT FROM NEW.version_no THEN
    RAISE EXCEPTION 'artifact_revisions content and version_no are immutable; create a new revision instead';
  END IF;
  IF OLD.status = 'approved' AND NEW.status NOT IN ('approved', 'superseded') THEN
    RAISE EXCEPTION 'Approved artifact revisions cannot transition to %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_artifact_revisions_immutable ON public.artifact_revisions;
CREATE TRIGGER trg_artifact_revisions_immutable
  BEFORE UPDATE OR DELETE ON public.artifact_revisions
  FOR EACH ROW EXECUTE FUNCTION public.bp_guard_artifact_revision_immutability();

-- 3. Enforce append-only audit_logs at database engine level
CREATE OR REPLACE FUNCTION public.bp_guard_audit_logs_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is strictly append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_append_only
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.bp_guard_audit_logs_append_only();

-- 4. Risk R-001 Mitigation: Validate both ends of polymorphic traceability_links belong to the same project_id
CREATE OR REPLACE FUNCTION public.bp_entity_belongs_to_project(
  p_entity_type public.entity_type,
  p_entity_id UUID,
  p_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_exists BOOLEAN := false;
BEGIN
  CASE p_entity_type
    WHEN 'requirement' THEN
      SELECT EXISTS(SELECT 1 FROM public.requirements WHERE id = p_entity_id AND project_id = p_project_id) INTO v_exists;
    WHEN 'decision' THEN
      SELECT EXISTS(SELECT 1 FROM public.decisions WHERE id = p_entity_id AND project_id = p_project_id) INTO v_exists;
    WHEN 'artifact' THEN
      SELECT EXISTS(SELECT 1 FROM public.artifacts WHERE id = p_entity_id AND project_id = p_project_id) INTO v_exists;
    WHEN 'feature' THEN
      SELECT EXISTS(SELECT 1 FROM public.features WHERE id = p_entity_id AND project_id = p_project_id) INTO v_exists;
    WHEN 'screen' THEN
      SELECT EXISTS(SELECT 1 FROM public.screen_specs WHERE id = p_entity_id AND project_id = p_project_id) INTO v_exists;
    WHEN 'architecture_component' THEN
      SELECT EXISTS(SELECT 1 FROM public.architecture_components WHERE id = p_entity_id AND project_id = p_project_id) INTO v_exists;
    WHEN 'db_entity' THEN
      SELECT EXISTS(SELECT 1 FROM public.db_entities WHERE id = p_entity_id AND project_id = p_project_id) INTO v_exists;
    WHEN 'api_endpoint' THEN
      SELECT EXISTS(SELECT 1 FROM public.api_endpoints WHERE id = p_entity_id AND project_id = p_project_id) INTO v_exists;
    WHEN 'development_task' THEN
      SELECT EXISTS(SELECT 1 FROM public.development_tasks WHERE id = p_entity_id AND project_id = p_project_id) INTO v_exists;
    WHEN 'test_case' THEN
      SELECT EXISTS(SELECT 1 FROM public.test_cases WHERE id = p_entity_id AND project_id = p_project_id) INTO v_exists;
  END CASE;
  RETURN v_exists;
END;
$$;

CREATE OR REPLACE FUNCTION public.bp_validate_traceability_link()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT public.bp_entity_belongs_to_project(NEW.source_type, NEW.source_id, NEW.project_id) THEN
    RAISE EXCEPTION 'Traceability source % (%) does not belong to project %', NEW.source_type, NEW.source_id, NEW.project_id;
  END IF;
  IF NOT public.bp_entity_belongs_to_project(NEW.target_type, NEW.target_id, NEW.project_id) THEN
    RAISE EXCEPTION 'Traceability target % (%) does not belong to project %', NEW.target_type, NEW.target_id, NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_traceability_same_project ON public.traceability_links;
CREATE TRIGGER trg_traceability_same_project
  BEFORE INSERT OR UPDATE ON public.traceability_links
  FOR EACH ROW EXECUTE FUNCTION public.bp_validate_traceability_link();

-- 5. Auto-provision profile on new auth.users signup
CREATE OR REPLACE FUNCTION public.bp_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, ''), '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.bp_handle_new_user();

-- 6. Auto-initialize all 10 lifecycle stages and 9 logical artifacts on project creation
CREATE OR REPLACE FUNCTION public.bp_handle_new_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s TEXT;
  a RECORD;
BEGIN
  FOREACH s IN ARRAY ARRAY[
    'idea', 'discovery', 'knowledge', 'brd_prd', 'scope',
    'ux', 'architecture', 'database_api', 'dev_qa', 'validate_export'
  ] LOOP
    INSERT INTO public.project_stages (project_id, workspace_id, stage_key, status, progress_pct)
    VALUES (
      NEW.id,
      NEW.workspace_id,
      s,
      CASE WHEN s = 'idea' THEN 'in_progress' ELSE 'not_started' END,
      CASE WHEN s = 'idea' THEN 25 ELSE 0 END
    )
    ON CONFLICT (project_id, stage_key) DO NOTHING;
  END LOOP;

  FOR a IN
    SELECT * FROM (VALUES
      ('brd', 'Business Requirements Document (BRD)'),
      ('prd', 'Product Requirements Document (PRD)'),
      ('mvp_scope', 'MVP Scope Specification'),
      ('ux_spec', 'UX/UI Specification'),
      ('architecture', 'System Architecture Blueprint'),
      ('database', 'Database Schema Specification'),
      ('api', 'API Contract Specification'),
      ('dev_plan', 'Development Execution Plan'),
      ('qa_plan', 'QA & Test Strategy Plan')
    ) AS t(artifact_type, title)
  LOOP
    INSERT INTO public.artifacts (project_id, workspace_id, artifact_type, title)
    VALUES (NEW.id, NEW.workspace_id, a.artifact_type, a.title)
    ON CONFLICT (project_id, artifact_type) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.bp_handle_new_project();
