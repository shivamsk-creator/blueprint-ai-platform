# Blueprint AI

Multi-tenant software specification, discovery, architecture modeling, traceability, governance, and export studio built with **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, **Supabase (PostgreSQL, Auth, Storage, pgmq Queues)**, and a dedicated persistent **Node.js Queue Worker**.

## Monorepo Architecture

```text
apps/
  web/                Next.js 16 App Router UI + Proxy + 54+ REST API Route Handlers
  worker/             Persistent Supabase Queues (pgmq) consumer & PDF/DOCX/SQL/OpenAPI exporter
packages/
  domain/             Pure domain models, 11 enums, RBAC matrix, diff/traceability/validation/DDL/OpenAPI engines
  validation/         Zod schemas for API payloads, 7 versioned job contracts, AI outputs & env vars
  database/           Supabase SSR/service clients, pgmq queue client, AES-256-GCM secret vault, tenant-isolated repository
  ai-providers/       Provider-agnostic adapters (OpenAI, Google Gemini, Anthropic Claude, OpenAI-Compatible) & model router
  ui/                 Tokenized Architectural Blueprint Studio design system & 16 reusable domain components
supabase/
  migrations/         9 sequential SQL migrations (52 tables, 11 enums, RLS on 100% of tables, pgmq queues, storage policies)
tests/                Vitest automated security, RLS, RBAC, AI routing, queue recovery, artifact & export tests
docs/                 Screen mapping, ADRs, API specification, DB/RLS guide, security audit & deployment runbooks
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template (runs in local preview mode out of the box; add Supabase keys for live mode)
cp .env.example .env.local

# 3. Start Next.js web app (http://localhost:3000)
npm run dev

# 4. (Optional in live Supabase mode) Start dedicated queue worker in a second terminal
npm run dev:worker
```

## Verification Commands

```bash
npm run check:migrations   # Verify all 52 tables, RLS coverage, secret & audit invariants
npm run typecheck          # Strict TypeScript check across all 7 workspaces
npm run lint               # ESLint (Next.js Core Web Vitals + TypeScript)
npm run test               # Full Vitest automated suite (TEN-01, RBAC-01, PROV-01, MODEL-01/02, JOB-01/02, ART-01, APP-01, TRACE-01, EXP-01, FILE-01)
npm run build              # Production Next.js + Worker verification build
```
