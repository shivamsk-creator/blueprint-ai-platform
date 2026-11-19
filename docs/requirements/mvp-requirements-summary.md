# Blueprint AI — MVP Requirements & Scope Summary

## 1. Product Lifecycle Covered
`Idea → Discovery → Knowledge → BRD → PRD → MVP Scope → UX/UI → Architecture → Database → API → Development Plan → QA → Validation & Export`

## 2. Core MVP Functional Requirements
- **Multi-Tenant Authentication & RBAC**: Supabase Auth + workspaces + invitations + 5-role RBAC (`owner`, `admin`, `manager`, `contributor`, `reviewer`) + optional restricted project membership.
- **Discovery & Knowledge Repository**: Private file uploads, discovery sessions, AI gap analysis, clarification Q&A with answer/deferral provenance, versioned requirements, assumptions, constraints, decisions, and research evidence citations.
- **Immutable Specification Authoring**: Structured JSON + Markdown sections for all 9 artifacts (`brd`, `prd`, `mvp_scope`, `ux_spec`, `architecture`, `database`, `api`, `dev_plan`, `qa_plan`) with immutable revisions, section-level AI regeneration, candidate diffs, and exact-revision approvals.
- **Technical Blueprinting**: Editable architecture component graph + ADRs, structured ERD + PostgreSQL SQL migration generator, API endpoint catalog + OpenAPI 3.1 contract validator, development tasks, and QA test cases.
- **Traceability, Validation, Governance & Export**: Polymorphic same-project traceability links, deterministic + AI validation runs, change impact analysis flagging stale artifacts, append-only audit logs, and asynchronous worker export rendering (PDF, DOCX, Markdown, JSON, SQL, OpenAPI YAML).
- **BYOK Multi-Provider AI**: OpenAI, Google Gemini, Anthropic Claude, and OpenAI-compatible adapters with server-only AES-256-GCM encrypted secrets, task compatibility validation, per-task model overrides, fallback policies, and server-side token/cost attribution.
