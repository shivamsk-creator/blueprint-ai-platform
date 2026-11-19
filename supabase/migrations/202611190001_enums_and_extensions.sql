-- Migration 0001: Extensions and Domain Enums
-- Reversible via DROP TYPE ... CASCADE (see docs/database/rollback-procedures.md)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Core domain enums from Blueprint AI Execution Workbook
DO $$ BEGIN
  CREATE TYPE public.workspace_role AS ENUM (
    'owner',
    'admin',
    'manager',
    'contributor',
    'reviewer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM (
    'draft',
    'active',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.stage_status AS ENUM (
    'not_started',
    'in_progress',
    'needs_input',
    'ready_for_review',
    'approved',
    'blocked'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.requirement_status AS ENUM (
    'proposed',
    'confirmed',
    'rejected',
    'deferred'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.requirement_priority AS ENUM (
    'critical',
    'high',
    'medium',
    'low'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.artifact_status AS ENUM (
    'draft',
    'in_review',
    'approved',
    'rejected',
    'superseded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ai_job_status AS ENUM (
    'queued',
    'running',
    'succeeded',
    'failed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ai_provider_type AS ENUM (
    'openai',
    'google',
    'anthropic',
    'openai_compatible'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.change_status AS ENUM (
    'draft',
    'submitted',
    'impact_review',
    'approved',
    'rejected',
    'applied'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.validation_severity AS ENUM (
    'blocker',
    'high',
    'medium',
    'low',
    'info'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.entity_type AS ENUM (
    'requirement',
    'decision',
    'artifact',
    'feature',
    'screen',
    'architecture_component',
    'db_entity',
    'api_endpoint',
    'development_task',
    'test_case'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
