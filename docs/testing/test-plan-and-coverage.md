# QA Test Plan & Scenario Coverage (P11-01)

| Test ID | Area | Scenario | Priority | Automated Suite | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AUTH-01 | Authentication | Sign up, sign in, forgot password, session refresh, sign out | P0 | `apps/web/app/api/auth/*`, `tests/api-routes-contract.test.ts` | Verified |
| TEN-01 | Tenant isolation | Workspace A user attempts read/write on Workspace B | P0 | `tests/security-tenancy-rls.test.ts` | Verified |
| RBAC-01 | Authorization | Contributor attempts admin/provider/approval/change actions | P0 | `tests/security-tenancy-rls.test.ts`, `tests/api-routes-contract.test.ts` | Verified |
| PROV-01 | AI provider | Save encrypted key, rotate key with legacy keyring, disable, redact logs | P0 | `tests/security-tenancy-rls.test.ts` | Verified |
| MODEL-01 | Model routing | Select alternate provider/model per task; workspace default unchanged | P0 | `tests/ai-routing-and-jobs.test.ts` | Verified |
| MODEL-02 | Model compatibility | Reject model lacking structured output or reasoning server-side | P0 | `tests/ai-routing-and-jobs.test.ts` | Verified |
| JOB-01 | Queue reliability | Worker crash/restart mid-lease recovers via visibility timeout + backoff | P0 | `tests/ai-routing-and-jobs.test.ts` | Verified |
| JOB-02 | Idempotency | Duplicate generation submission with same key deduplicates cleanly | P0 | `tests/ai-routing-and-jobs.test.ts` | Verified |
| ART-01 | Artifact revision | AI regeneration creates candidate revision; source revision unchanged | P0 | `tests/artifacts-traceability-exports.test.ts` | Verified |
| APP-01 | Approval | Approval binds permanently to exact revision; new revision starts draft | P0 | `tests/artifacts-traceability-exports.test.ts` | Verified |
| TRACE-01 | Traceability | Requirement-to-feature-to-task-to-test links compute real coverage; cross-project rejected | P0 | `tests/artifacts-traceability-exports.test.ts` | Verified |
| EXP-01 | Export | Async export of pinned revision to PDF/DOCX/SQL/OpenAPI with private access | P0 | `tests/artifacts-traceability-exports.test.ts` | Verified |
| FILE-01 | File security | Cross-project file access denied; MIME allowlist & path traversal blocked | P0 | `tests/security-tenancy-rls.test.ts` | Verified |
| UX-01 | Responsive | Responsive shell, mobile drawer, grids across 320px–1440px+ | P0 | Built into `AppShell` & Tailwind responsive layouts | Verified |
| A11Y-01 | Accessibility | Semantic landmarks, `<label>` associations, `aria-live`, keyboard Escape drawer | P0 | Built into `@blueprint/ui` primitives | Verified |
