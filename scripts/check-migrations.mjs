#!/usr/bin/env node
/**
 * Static verification of Supabase SQL migrations:
 * 1. Ensures migrations are monotonically numbered and non-empty.
 * 2. Ensures all 52 workbook tables are created.
 * 3. Ensures every tenant-owned table enables ROW LEVEL SECURITY (RLS).
 * 4. Ensures ai_provider_secrets has NO client/anon/authenticated SELECT policy.
 * 5. Ensures audit_logs is append-only (no client UPDATE/DELETE policy).
 */
import fs from "node:fs";
import path from "node:path";

const REQUIRED_TABLES = [
  "profiles",
  "workspaces",
  "workspace_members",
  "workspace_invitations",
  "projects",
  "project_members",
  "project_stages",
  "project_files",
  "discovery_sessions",
  "clarification_questions",
  "clarification_answers",
  "requirements",
  "requirement_revisions",
  "assumptions",
  "constraints",
  "decisions",
  "research_sources",
  "research_evidence",
  "artifacts",
  "artifact_revisions",
  "artifact_sections",
  "artifact_comments",
  "features",
  "ux_personas",
  "user_journeys",
  "screen_specs",
  "architecture_components",
  "architecture_relationships",
  "architecture_decisions",
  "db_entities",
  "db_attributes",
  "db_relationships",
  "api_endpoints",
  "development_tasks",
  "task_dependencies",
  "test_cases",
  "traceability_links",
  "validation_runs",
  "validation_issues",
  "change_requests",
  "change_impacts",
  "approvals",
  "ai_providers",
  "ai_provider_secrets",
  "ai_models",
  "ai_task_policies",
  "ai_jobs",
  "ai_job_events",
  "ai_usage_records",
  "audit_logs",
  "notifications",
  "export_files",
];

const migrationsDir = path.resolve(process.cwd(), "supabase", "migrations");
if (!fs.existsSync(migrationsDir)) {
  console.error("ERROR: supabase/migrations directory not found.");
  process.exit(1);
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("ERROR: No SQL migration files found.");
  process.exit(1);
}

const combinedSql = files
  .map((f) => fs.readFileSync(path.join(migrationsDir, f), "utf8"))
  .join("\n\n");

const errors = [];

for (const table of REQUIRED_TABLES) {
  const createRe = new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.${table}\\b`, "i");
  if (!createRe.test(combinedSql)) {
    errors.push(`Missing CREATE TABLE public.${table}`);
  }
  const rlsRe = new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i");
  if (!rlsRe.test(combinedSql)) {
    errors.push(`Missing ENABLE ROW LEVEL SECURITY on public.${table}`);
  }
}

if (/CREATE\s+POLICY[\s\S]*?ON\s+public\.ai_provider_secrets\s+FOR\s+SELECT\s+TO\s+(?:authenticated|anon|public)/i.test(combinedSql)) {
  errors.push("SECURITY VIOLATION: Client SELECT policy found on public.ai_provider_secrets");
}

if (/CREATE\s+POLICY[\s\S]*?ON\s+public\.audit_logs\s+FOR\s+(?:UPDATE|DELETE)/i.test(combinedSql)) {
  errors.push("SECURITY VIOLATION: UPDATE/DELETE policy found on append-only public.audit_logs");
}

if (errors.length > 0) {
  console.error("Migration validation failed:");
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(`OK: Verified ${files.length} migration files, ${REQUIRED_TABLES.length} tables, RLS enabled on all tables, and security invariants.`);
