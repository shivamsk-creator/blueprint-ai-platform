# Database Schema, RLS, pgmq Queues & Backup/PITR Guide

## 1. Migration Sequence (`supabase/migrations/`)

1. `202611190001_enums_and_extensions.sql` — Enables `pgcrypto` and `pgmq`; creates all 11 domain enums.
2. `202611190002_auth_tenancy_projects.sql` — `profiles`, `workspaces`, `workspace_members`, `workspace_invitations`, `projects`, `project_members`, `project_stages`, `project_files`.
3. `202611190003_discovery_knowledge.sql` — `discovery_sessions`, `clarification_questions`, `clarification_answers`, `requirements`, `requirement_revisions`, `assumptions`, `constraints`, `decisions`, `research_sources`, `research_evidence`.
4. `202611190004_artifacts_scope_ux.sql` — `artifacts`, `artifact_revisions`, `artifact_sections`, `artifact_comments`, `features`, `ux_personas`, `user_journeys`, `screen_specs`.
5. `202611190005_technical_delivery_qa.sql` — `architecture_components`, `architecture_relationships`, `architecture_decisions`, `db_entities`, `db_attributes`, `db_relationships`, `api_endpoints`, `development_tasks`, `task_dependencies`, `test_cases`.
6. `202611190006_governance_traceability.sql` — `traceability_links`, `validation_runs`, `validation_issues`, `change_requests`, `change_impacts`, `approvals`, `audit_logs`, `notifications`, `export_files`.
7. `202611190007_ai_providers_jobs_usage.sql` — `ai_providers`, `ai_provider_secrets`, `ai_models`, `ai_task_policies`, `ai_jobs`, `ai_job_events`, `ai_usage_records`, `pgmq.create('blueprint_jobs')`, `pgmq.create('blueprint_jobs_dlq')`, and service-role-only queue RPC functions.
8. `202611190008_rls_and_storage_policies.sql` — Security-definer RLS helper functions, `ENABLE ROW LEVEL SECURITY` on all 52 tables, `REVOKE ALL` on `ai_provider_secrets`, private storage buckets (`project-files`, `exports`) and path-scoped storage policies.
9. `202611190009_triggers_and_seed_helpers.sql` — Triggers enforcing `artifact_revisions` immutability, append-only `audit_logs`, same-project polymorphic `traceability_links` validation, auto-profile creation on signup, and auto-provisioning of 10 stages + 9 artifacts per new project.

## 2. Backup, Point-in-Time Recovery (PITR) & Rollback

- **Managed Backups**: Enable Supabase Pro PITR (WAL archiving every 2 minutes) plus daily automated encrypted off-site logical dumps (`pg_dump --format=custom --no-owner`).
- **Restore Verification Drill**: Schedule monthly staging restores verifying `SELECT count(*) FROM public.audit_logs`, RLS enforcement, and `pgmq.metrics('blueprint_jobs')`.
- **Migration Rollback**: Apply forward-compatible Expand-and-Contract changes for production. Never run destructive `DROP TABLE` / `DROP COLUMN` statements without explicit operator approval and a verified pre-migration snapshot.
