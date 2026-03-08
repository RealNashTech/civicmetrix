# Database Integrity Audit

## Scope
- Prisma schema, migrations, migration safety tooling, index coverage, drift controls.

## Findings

### 1) CI drift command is incompatible with installed Prisma version
- Risk Level: **High**
- Impact: migration drift check step fails; release confidence is reduced.
- Evidence: workflow uses `--to-schema-datamodel` (`.github/workflows/ci.yml:70`), but Prisma 7 rejects it.
- Recommended Fix: update to supported flags (`--to-schema`) and provide `--shadow-database-url`.
- Estimated Effort: **Low**

### 2) Migration safety checker is too narrow
- Risk Level: **Medium**
- Impact: destructive patterns can pass CI undetected.
- Evidence: checker only flags one regex (`scripts/check-migrations.ts:6-15`).
- Recommended Fix: expand rules to detect table rewrites, drops, non-concurrent index creation, large-table lock risks, and delete/update without bounded predicates.
- Estimated Effort: **Medium**

### 3) Legacy backfill migration uses weak hash fallback for API tokens
- Risk Level: **Medium**
- Impact: predictable fallback token hashes for legacy rows if plaintext token existed.
- Evidence: `md5(...)` fallback in `20260304160304_secure_api_tokens/migration.sql:16`.
- Recommended Fix: force rotation/invalidation of legacy tokens post-migration and disallow fallback-derived active tokens.
- Estimated Effort: **Low**

### 4) Materialized view maintenance exists but correctness depends on worker uptime
- Risk Level: **Medium**
- Impact: stale `grant_pipeline_summary` metrics if refresh worker is down.
- Evidence: MV defined in `20260305000500...`; refreshed in `src/workers/grant-pipeline-refresh-worker.ts`.
- Recommended Fix: add staleness checks and fallback query path in API/page consumers.
- Estimated Effort: **Medium**

### 5) Index coverage is generally good for hot paths
- Risk Level: **Low**
- Impact: positive; several operational indexes exist (`20260306000500`, `20260306000600`).
- Recommended Fix: continue query-plan review with production data statistics.
- Estimated Effort: **Low**

## Drift Check Execution Notes
- `npm run check:migrations` passes locally.
- `prisma migrate diff` requires updated flags and shadow DB config in this repo setup.
