# Security Audit Report — Blueprint AI MVP

**Audit Date**: 2026-11-19  
**Scope**: OWASP Top 10 (Web & API Security), Multi-Tenant RLS Isolation, AI Secret Storage, File Upload & Export Security  
**Critical / High Unresolved Findings**: **0**

## Control Verification Summary

| Control Domain | Implementation | Verification |
| :--- | :--- | :--- |
| **A01 Broken Access Control (BOLA/BFLA)** | PostgreSQL RLS enabled on 52/52 tables + server-side RBAC matrix (`packages/domain/src/rbac.ts`) on every route | Verified by `TEN-01`, `RBAC-01`, `FILE-01` automated tests & `scripts/check-migrations.mjs` |
| **A02 Cryptographic Failures** | AI provider API keys encrypted with AES-256-GCM (`packages/database/src/crypto.ts`) with random 96-bit IVs, versioned envelopes, and zero-downtime key rotation | Verified by `PROV-01` encryption, rotation, and non-disclosure tests |
| **A03 Injection** | Zod boundary validation (`@blueprint/validation`) on 100% of JSON/param inputs; parameterized Supabase queries; strict regex validation for SQL identifiers and slugs | Verified by API contract tests (`422 RFC 7807`) |
| **A04 Insecure Design** | Immutable artifact revisions, exact-revision approval locking, non-overwriting AI candidates, idempotency keys, and same-project traceability triggers | Verified by `ART-01`, `APP-01`, `JOB-02`, `TRACE-01` tests |
| **A05 Security Misconfiguration** | Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) applied in `apps/web/proxy.ts`; zero stack traces in RFC 7807 errors | Verified in `apps/web/proxy.ts` and `apps/web/lib/http.ts` |
| **A07 Auth & Session Failures** | Supabase Auth PKCE callback with open-redirect guard, `HttpOnly` + `SameSite=Lax` cookies, rate limiting on auth endpoints, enumeration-safe forgot-password response | Verified in `apps/web/app/api/auth/*` |
| **A09 Logging & Monitoring** | Structured JSON logging with `x-request-id`, automatic `redactSensitiveData` secret scrubbing, append-only `audit_logs` enforced by DB trigger | Verified by `PROV-01` redaction tests & SQL trigger check |
| **A10 SSRF** | Custom OpenAI-compatible `baseUrl` validated in `packages/ai-providers/src/adapters.ts` requiring HTTPS and blocking cloud metadata IPs (`169.254.169.254`, `metadata.google.internal`) | Verified in adapter URL guard |

## Secret Rotation Procedure (`AI_SECRETS_ENCRYPTION_KEY`)
1. Generate a new 32-byte hex key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
2. Move the previous key into `AI_SECRETS_LEGACY_KEYS="v1:<old_hex>"`.
3. Set `AI_SECRETS_KEY_VERSION=v2` and `AI_SECRETS_ENCRYPTION_KEY=<new_hex>` in both web and worker runtimes.
4. Re-encrypt active rows in `ai_provider_secrets` with `v2`, confirm worker health, then remove `v1` from `AI_SECRETS_LEGACY_KEYS`.
