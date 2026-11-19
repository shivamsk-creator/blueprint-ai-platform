# Blueprint AI — Project Handover Package

## 1. Repository Map
- `apps/web` — Next.js 16 App Router application (35+ pages, 54+ API Route Handlers, `proxy.ts`)
- `apps/worker` — Dedicated persistent pgmq queue worker & PDF/DOCX/SQL/OpenAPI export renderer
- `packages/domain` — Pure TypeScript domain models, 11 enums, RBAC matrix, diff/traceability/validation/SQL/OpenAPI engines
- `packages/validation` — Zod boundary schemas, 7 versioned job contracts, AI output schemas, env validation
- `packages/database` — Supabase SSR/service clients, pgmq queue client, AES-256-GCM keyring encryption, tenant-isolated repository
- `packages/ai-providers` — OpenAI, Google Gemini, Anthropic Claude, and OpenAI-Compatible adapters + task compatibility model router
- `packages/ui` — Tokenized Architectural Blueprint Studio design system (`tokens.css`) + all 16 workbook components
- `supabase/migrations` — 9 sequential migrations covering all 52 tables, 11 enums, pgmq queues, RLS, triggers, and private storage buckets

## 2. Connecting Live Supabase & Running Staging Verification
1. Provision a Supabase project (PostgreSQL 16 with `pgmq` enabled).
2. Run `supabase link --project-ref <ref> && supabase db push`.
3. Generate a 32-byte encryption key (`AI_SECRETS_ENCRYPTION_KEY`) and populate `.env.local` from `.env.example` with `BLUEPRINT_DEMO_MODE=false`.
4. Deploy `apps/web` and `apps/worker` as separate processes; verify `/api/healthz`, `/api/readyz`, and worker `/healthz`.
