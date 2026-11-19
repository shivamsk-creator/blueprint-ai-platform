# Blueprint AI — API Specification

All endpoints are served under `/api/*`, validate 100% of external payloads with Zod (`@blueprint/validation`), enforce server-side authentication & RBAC, include `x-request-id` correlation headers, and return **RFC 7807 Problem Details** (`application/problem+json`) on error.

## Health & Authentication
- `GET /api/healthz` — Liveness probe (`200 OK`)
- `GET /api/readyz` — Readiness & runtime mode probe (`200 OK`)
- `GET / POST / DELETE /api/auth/session` — Session lookup, sign-in / workspace switch, sign-out
- `POST /api/auth/sign-up` — User registration via Supabase Auth
- `POST /api/auth/forgot-password` — Enumeration-safe password recovery
- `GET /api/auth/callback` — Supabase Auth PKCE code exchange

## Workspaces & Tenancy
- `GET / POST /api/workspaces` — List / create workspaces
- `GET / PATCH /api/workspaces/[workspaceId]` — Read / update workspace (Admin+)
- `GET /api/workspaces/[workspaceId]/members` — List members & pending invitations (Admin+)
- `POST /api/workspaces/[workspaceId]/invitations` — Issue hashed invitation (Admin+)

## Projects, Stages & Private Files
- `GET / POST /api/projects` — List workspace projects / create project (Contributor+)
- `GET / PATCH /api/projects/[projectId]` — Project overview / update or archive (Manager+)
- `GET /api/projects/[projectId]/stages` — Lifecycle stage progress
- `PATCH /api/projects/[projectId]/stages/[stageKey]` — Update stage status (Manager+)
- `GET / POST /api/projects/[projectId]/files` — List / register private project upload with MIME & size validation

## Discovery, Clarifications, Knowledge & Decisions
- `GET / POST /api/projects/[projectId]/discovery/sessions`
- `POST /api/projects/[projectId]/discovery/analyze` (`202 Accepted` async job)
- `GET / POST /api/projects/[projectId]/discovery/questions`
- `PATCH /api/discovery/questions/[questionId]`
- `GET / POST /api/projects/[projectId]/requirements`
- `GET / PATCH /api/requirements/[requirementId]` (creates requirement revision & flags linked artifacts if confirmed)
- `GET / POST /api/projects/[projectId]/decisions`
- `GET / POST /api/projects/[projectId]/knowledge` (assumptions, constraints, research sources & evidence)

## Artifacts, Revisions, Diffs & Approvals
- `GET /api/projects/[projectId]/artifacts`
- `GET /api/artifacts/[artifactId]`
- `GET / POST /api/artifacts/[artifactId]/revisions`
- `POST /api/artifacts/[artifactId]/generate` (`202 Accepted`, creates non-overwriting candidate revision)
- `POST /api/artifacts/[artifactId]/regenerate-section` (`202 Accepted`, section patch candidate)
- `GET /api/artifact-revisions/[revisionId]/diff`
- `POST /api/artifact-revisions/[revisionId]/approve` (Reviewer+; binds permanently to exact revision)

## Technical Design, Delivery, QA, Traceability & Governance
- `GET / POST /api/projects/[projectId]/features`
- `GET / POST /api/projects/[projectId]/ux`
- `GET / POST /api/projects/[projectId]/architecture/components`
- `GET / POST /api/projects/[projectId]/database/entities`
- `GET / POST /api/projects/[projectId]/api-endpoints`
- `GET / POST /api/projects/[projectId]/development-tasks`
- `GET / POST /api/projects/[projectId]/test-cases`
- `GET / POST /api/projects/[projectId]/traceability` (validates same-project entities)
- `GET / POST /api/projects/[projectId]/validation-runs`
- `GET /api/validation-runs/[runId]`
- `GET / POST /api/projects/[projectId]/changes` (Manager+; auto-computes downstream impacts)
- `GET /api/projects/[projectId]/activity`

## AI Providers, Models, Jobs, Usage, Audit & Exports
- `GET / POST /api/settings/ai-providers` (Admin+; metadata only, zero secrets returned)
- `PATCH /api/settings/ai-providers/[providerId]` (Admin+; toggle or rotate key)
- `POST /api/settings/ai-providers/[providerId]/test` (Admin+; live adapter test)
- `GET /api/settings/ai-models` (Workspace member)
- `PUT /api/settings/ai-task-policies/[taskType]` (Admin+; validates model compatibility)
- `GET /api/settings/ai-usage`
- `GET /api/settings/audit` (Admin+)
- `GET / POST /api/projects/[projectId]/ai-jobs`
- `GET /api/ai-jobs/[jobId]`
- `POST /api/ai-jobs/[jobId]/cancel`
- `GET / POST /api/projects/[projectId]/exports`
- `GET /api/exports/[exportId]`
- `GET /api/exports/[exportId]/download` (Authenticated private binary download)
