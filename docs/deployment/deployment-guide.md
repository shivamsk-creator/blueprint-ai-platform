# Deployment Guide & Rollback Runbook (P11-02)

## 1. Prerequisites & Environment Variables

Populate `.env.local` (for local) or platform secrets (Vercel / Railway / Fly.io / Docker) using `.env.example` as the strict contract:

- **Web (`apps/web`)**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_SECRETS_ENCRYPTION_KEY`, `AI_SECRETS_KEY_VERSION`, `APP_URL`, `STORAGE_BUCKET_PROJECT_FILES`, `STORAGE_BUCKET_EXPORTS`, `BLUEPRINT_DEMO_MODE=false`.
- **Worker (`apps/worker`)**: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_SECRETS_ENCRYPTION_KEY`, `AI_SECRETS_KEY_VERSION`, `WORKER_POLL_INTERVAL_MS=2000`, `WORKER_CONCURRENCY=4`, `WORKER_HEALTH_PORT=4001`, `AI_PROVIDER_TIMEOUT_MS=60000`, `AI_MAX_RETRIES=3`.

## 2. Database Migration Deployment

```bash
# Link hosted Supabase project and push migrations
supabase link --project-ref <your-project-ref>
supabase db push
```

Run `npm run check:migrations` in CI prior to any `supabase db push`.

## 3. Application & Worker Deployment

- **Web App (`apps/web`)**: Build with `npm run build --workspace=@blueprint/web` and run `npm run start --workspace=@blueprint/web` (or deploy monorepo root `apps/web` to Vercel).
  - Verify `GET /api/healthz` -> `200 OK`
  - Verify `GET /api/readyz` -> `200 OK` with `"mode": "supabase"`
- **Persistent Queue Worker (`apps/worker`)**: Deploy as a dedicated always-on service (`npm run start:worker`) on Railway, Fly.io, ECS, or systemd — never inside serverless web functions.
  - Verify `GET http://<worker-host>:4001/healthz` -> `200 OK`

## 4. Rollback Runbook

1. **Web/Worker Regression**: Immediately redeploy the previous known-good container/commit release. Because migrations follow forward-compatible Expand-and-Contract discipline, previous application binaries remain compatible with newly applied additive migrations.
2. **Queue Incident / Poison Messages**: Inspect `pgmq.read('blueprint_jobs_dlq', 60, 20)`. Pause worker scaling if an upstream AI provider outage persists; healthy jobs resume automatically upon restart with zero lost work.
3. **Database Corruption**: Initiate Supabase Point-in-Time Recovery (PITR) to the timestamp immediately preceding the incident after obtaining explicit operator approval.
