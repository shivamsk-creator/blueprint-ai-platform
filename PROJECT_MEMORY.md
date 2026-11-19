# Blueprint AI — Project Memory & Execution Tracker

**Status**: MVP Phases P00–P10 Implemented & Verified; P11 Release Hardening Artifacts Authored  
**Last Updated**: 2026-11-19  
**Stack**: Next.js 16 (App Router + Proxy + Route Handlers) · Strict TypeScript · Tailwind CSS v4 · Supabase PostgreSQL / Auth / Storage / Queues (pgmq) · Dedicated Persistent Node.js Worker

---

## 1. Execution Plan Status Matrix

| Task ID | Phase | Work Item | Status | Implementation Evidence |
| :--- | :--- | :--- | :--- | :--- |
| P00-01 | Project foundation | Confirm UI design system & map screens to routes/components | Done (Approved) | `docs/design/screen-to-route-mapping.md`, `packages/ui/src/tokens.css` (Architectural Blueprint Studio design approved as final) |
| P00-02 | Project foundation | Monorepo structure & strict TypeScript conventions | Done | `apps/web`, `apps/worker`, `packages/{domain,validation,database,ai-providers,ui}` |
| P00-03 | Project foundation | Next.js 16, Tailwind v4 design tokens & 16 UI primitives | Done | `packages/ui/src/*`, `apps/web/app/globals.css` |
| P00-04 | Project foundation | Supabase migrations, local config, pgmq queues, storage buckets | Done | `supabase/migrations/202611190001..0009.sql`, `supabase/config.toml` |
| P00-05 | Project foundation | CI: migration check, typecheck, lint, tests, build | Done | `.github/workflows/ci.yml`, `scripts/check-migrations.mjs` |
| P01-01 | Auth & tenancy | Supabase Auth flows, Proxy session refresh, sign-in/up/reset | Done | `apps/web/proxy.ts`, `apps/web/app/(auth)/*`, `apps/web/app/api/auth/*` |
| P01-02 | Auth & tenancy | Workspaces, memberships, hashed invitations & 5-role RBAC | Done | `packages/domain/src/rbac.ts`, `apps/web/app/api/workspaces/*` |
| P01-03 | Auth & tenancy | RLS policies across all 52 tables & cross-tenant test suite | Done | `202611190008_rls_and_storage_policies.sql`, `tests/security-tenancy-rls.test.ts` |
| P01-04 | Auth & tenancy | Onboarding, workspace switcher & team settings UI | Done | `/onboarding`, `AppShell`, `/settings/general`, `/settings/members` |
| P02-01 | Projects & shell | Responsive authenticated shell & 10-stage project sidebar | Done | `packages/ui/src/AppShell.tsx`, `ProjectSidebar.tsx` |
| P02-02 | Projects & shell | Project CRUD, archive & restricted project access | Done | `apps/web/app/api/projects/*` |
| P02-03 | Projects & shell | Dashboard, project listing & project overview | Done | `/dashboard`, `/projects`, `/projects/new`, `/projects/[projectId]` |
| P03-01 | Discovery & knowledge | Private file upload pipeline with MIME/size/path validation | Done | `FileUploader.tsx`, `/api/projects/[projectId]/files` |
| P03-02 | Discovery & knowledge | Discovery sessions, clarification questions, answers & deferrals | Done | `/discovery`, `/discovery/questions`, `/api/discovery/*` |
| P03-03 | Discovery & knowledge | Requirement/assumption/constraint/decision repo with revisions | Done | `/knowledge`, `/requirements/[requirementId]`, `/decisions` |
| P03-04 | Discovery & knowledge | Research sources & evidence provenance capture | Done | `research_sources`, `research_evidence`, `/api/projects/[projectId]/knowledge` |
| P04-01 | AI foundation | Provider-agnostic adapter interface & registry (OpenAI/Gemini/Anthropic/Compat) | Done | `packages/ai-providers/src/adapters.ts` |
| P04-02 | AI foundation | AES-256-GCM server-only secret encryption, rotation & test connection | Done | `packages/database/src/crypto.ts`, `/api/settings/ai-providers/*` |
| P04-03 | AI foundation | Model catalogue, capability metadata & task compatibility checks | Done | `packages/ai-providers/src/catalog.ts` |
| P04-04 | AI foundation | Workspace defaults, per-task model override & fallback router | Done | `packages/ai-providers/src/router.ts`, `/settings/ai-models` |
| P04-05 | AI foundation | Server-side token usage, cost estimation & reconciliation | Done | `ai_usage_records`, `/ai-usage`, `/settings/ai-usage` |
| P05-01 | Jobs & orchestration | Versioned job payload schemas (7 job types) & idempotency keys | Done | `packages/validation/src/jobs.ts` |
| P05-02 | Jobs & orchestration | Supabase Queues (pgmq) RPC client & persistent worker consumer | Done | `packages/database/src/queue.ts`, `apps/worker/src/*` |
| P05-03 | Jobs & orchestration | Retries, exponential backoff+jitter, timeout, cancellation & DLQ | Done | `apps/worker/src/retry.ts`, `apps/worker/src/processor.ts` |
| P05-04 | Jobs & orchestration | Job status UI with polling/realtime recovery & cancel control | Done | `packages/ui/src/JobStatus.tsx`, `apps/web/lib/client-api.ts` |
| P06-01 | Artifacts | 9 artifact types, immutable revisions, sections & comments | Done | `ArtifactEditor.tsx`, `/api/artifacts/*` |
| P06-02 | Artifacts | BRD generation & structured editor/review | Done | `/projects/[projectId]/artifacts/brd` |
| P06-03 | Artifacts | PRD generation linked to confirmed requirements | Done | `/projects/[projectId]/artifacts/prd` |
| P06-04 | Artifacts | Section-level regeneration & candidate diff/accept/reject | Done | `VersionDiff.tsx`, `/api/artifacts/[artifactId]/regenerate-section` |
| P07-01 | Scope & UX | Feature catalogue, prioritization & MVP scope planner | Done | `/projects/[projectId]/scope` |
| P07-02 | Scope & UX | Personas, user journeys & screen inventory specs | Done | `/projects/[projectId]/ux` |
| P08-01 | Technical artifacts | Editable architecture component graph, flows & ADRs | Done | `ArchitectureCanvas.tsx`, `/projects/[projectId]/architecture` |
| P08-02 | Technical artifacts | Structured ERD canvas & PostgreSQL SQL migration draft export | Done | `ERDCanvas.tsx`, `/projects/[projectId]/database` |
| P08-03 | Technical artifacts | API endpoint catalogue & validated OpenAPI 3.1 contract | Done | `/projects/[projectId]/api`, `generateOpenApiSpec` |
| P09-01 | Delivery & QA | Development tasks, phases, dependencies & acceptance criteria | Done | `/projects/[projectId]/development` |
| P09-02 | Delivery & QA | QA test cases linked to requirements | Done | `/projects/[projectId]/qa` |
| P09-03 | Delivery & QA | Live traceability matrix & deterministic + AI validation runs | Done | `TraceabilityMatrix.tsx`, `/traceability`, `/validation` |
| P10-01 | Governance & export | Exact-revision approvals, review center & append-only audit logs | Done | `ApprovalPanel.tsx`, `/reviews`, `/settings/audit` |
| P10-02 | Governance & export | Change requests, BFS impact analysis & stale artifact flags | Done | `analyzeChangeImpact`, `/changes`, `updateRequirement` |
| P10-03 | Governance & export | Async worker export rendering: PDF, DOCX, MD, JSON, SQL, OpenAPI | Done | `apps/worker/src/exporters.ts`, `/exports`, `/api/exports/[exportId]/download` |
| P11-01 | Release hardening | Automated unit, integration, API, RLS & security test suite | Done (Automated) | `tests/*.test.ts` (live staging Playwright/load tests run upon Supabase provisioning) |
| P11-02 | Release hardening | Deployment guide, monitoring probes, backup/PITR & rollback runbooks | Done | `docs/deployment/deployment-guide.md`, `/api/healthz`, `/api/readyz`, worker `/healthz` |
| P11-03 | Release hardening | Live customer pilot & usability triage | Pending Live Env | Awaiting hosted Supabase project credentials |

---

## 2. Resolved Architectural Decisions (D-001 through D-014)

- **D-009 (AI Credential Storage)**: App-managed AES-256-GCM encryption (`AI_SECRETS_ENCRYPTION_KEY`) in server-only `public.ai_provider_secrets` with versioned envelopes (`enc:<ver>:<iv>:<tag>:<ct>`) and multi-key legacy keyring (`AI_SECRETS_LEGACY_KEYS`) for zero-downtime rotation.
- **D-010 (Realtime Job Updates)**: Supabase Realtime publication enabled on `ai_jobs`, `ai_job_events`, and `notifications` paired with reconnect-safe exponential-backoff polling (`pollJobUntilComplete`) on the client.
- **D-011 (Document Editor)**: Structured JSON + section-level Markdown editor (`ArtifactEditor`) enforcing immutable revisions and clean line-level section diffs (`VersionDiff`).
- **D-012 (Research Capability)**: Provenance-first `research_sources` & `research_evidence` tables capturing source metadata, URLs, uploaded file references, excerpts, and claim linkages; external web search adapter pluggable via `research.synthesize` job.
- **D-013 (Export Rendering)**: Zero-headless-browser server-side renderers (`pdf-lib` for PDF, `docx` for Word OpenXML, `yaml` for OpenAPI 3.1, deterministic SQL/Markdown/JSON generators) executed exclusively inside `apps/worker`.
- **D-014 (Queue Worker Hosting)**: Persistent Node.js worker (`apps/worker`) running separately from Next.js web runtime (Docker/Railway/Fly.io/systemd) with configurable `WORKER_CONCURRENCY`, graceful `SIGTERM` draining, and HTTP `/healthz` probe.
