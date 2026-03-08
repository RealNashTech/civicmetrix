# CivicMetrix Technical Evaluation 2026

## Executive Summary
CivicMetrix has a strong foundation: clear Next.js App Router segmentation, extensive domain modeling, meaningful RLS migrations, queue-backed workers, and baseline observability/CI. The platform is **close to production-ready for moderate-risk municipal workloads**, but not yet hardened for high-assurance multi-tenant government environments.

The largest risk area is **tenant-safety consistency** in application data-access patterns rather than raw database capability. The database has serious tenant controls (RLS + composite tenant FKs), but the codebase currently uses multiple tenant access approaches (`db()`, `dbSystem()`, `tenantDb`, and `getTenantDb`) with mixed semantics.

## Key Findings (Prioritized)

### Critical/High
1. **Schema/model drift on PostGIS `location`**
   - `IssueReport.location` exists and is indexed in migrations, and is actively queried in API code, but is not represented in Prisma schema.
   - Evidence:
     - [20260304160754_add_postgis_spatial_support/migration.sql](/root/civicmetrix/prisma/migrations/20260304160754_add_postgis_spatial_support/migration.sql:4)
     - [backfill_issue_locations/migration.sql](/root/civicmetrix/prisma/migrations/backfill_issue_locations/migration.sql:1)
     - [issues-by-cluster route](/root/civicmetrix/src/app/api/public/issues-by-cluster/route.ts:71)
     - [IssueReport model lacks `location`](/root/civicmetrix/prisma/schema.prisma:377)
   - Impact: migration drift risk, fragile raw-SQL dependence, and harder evolution/testing of spatial behavior.

2. **Tenant access patterns are inconsistent and easy to misuse**
   - Core tenant-safe strategy is present, but multiple pathways coexist with different guarantees.
   - Evidence:
     - tenant-aware proxy [db()](/root/civicmetrix/src/lib/db.ts:181)
     - system proxy [dbSystem()](/root/civicmetrix/src/lib/db.ts:294)
     - transaction helper [tenantDb](/root/civicmetrix/src/lib/tenantDb.ts:3)
     - alternate helper [getTenantDb](/root/civicmetrix/src/lib/tenant-db.ts:3)
   - Impact: accidental cross-tenant regression or RLS/session bugs during feature work.

3. **Public write paths use `dbSystem()` directly for tenant rows**
   - Public write/read endpoints often scope by `organizationId` but do not consistently set tenant session context.
   - Evidence:
     - [public report issue API create](/root/civicmetrix/src/app/api/public/report-issue/route.ts:40)
     - [public report-issue server action transaction](/root/civicmetrix/src/app/public/[slug]/report-issue/actions.ts:165)
   - Impact: behavior depends on DB role/RLS setup; easy to break when runtime role policies tighten.

### Medium
4. **Duplicate tenant context set in public dashboard loader**
   - `tenantDb` already calls `set_config`, but page loader calls it again inside callback.
   - Evidence:
     - [tenantDb helper](/root/civicmetrix/src/lib/tenantDb.ts:10)
     - [public page duplicate call](/root/civicmetrix/src/app/public/[slug]/page.tsx:88)
   - Impact: not fatal, but signals pattern confusion and maintenance friction.

5. **Response contract is not standardized across APIs**
   - Mixed patterns: `{ ok: ... }`, `{ success: ... }`, plain `{ error: ... }`, `NextResponse` and `Response` mixed.
   - Evidence:
     - [apiSuccess helper](/root/civicmetrix/src/lib/api/success-response.ts:1)
     - [apiError helper](/root/civicmetrix/src/lib/api/error-response.ts:1)
     - [public report issue returns `ok`](/root/civicmetrix/src/app/api/public/report-issue/route.ts:59)
     - [citizen register returns `success`](/root/civicmetrix/src/app/api/citizen/register/route.ts:65)
   - Impact: client integration complexity and inconsistent error handling.

6. **Client chart components log in production**
   - Evidence:
     - [GrantFlowChart console.log](/root/civicmetrix/src/components/demo/GrantFlowChart.tsx:31)
     - [AssetHealthChart console.log](/root/civicmetrix/src/components/demo/AssetHealthChart.tsx:32)
   - Impact: noisy console, minor telemetry leakage.

7. **Rate-limiting architecture is fragmented and partially fail-open**
   - Multiple limiter layers/modules with different behavior and transport backends.
   - Evidence:
     - [edge/global limiter](/root/civicmetrix/src/lib/rate-limit.ts:1)
     - [security limiter](/root/civicmetrix/src/lib/security/rate-limit.ts:1)
     - [server action wrapper](/root/civicmetrix/src/middleware/rate-limit.ts:1)
   - Impact: hard to reason about effective policy; endpoint-level differences can become security gaps.

8. **Environment validation is rigid and can block deploy modes**
   - Requires Upstash keys even when runtime may use local Redis fallback.
   - Evidence:
     - [required env list](/root/civicmetrix/src/lib/config/env.ts:1)
   - Impact: lower operational flexibility across environments.

## Architecture Overview
- Framework: Next.js App Router (`src/app`) with clear route domains:
  - `/dashboard` for staff operations
  - `/public` for transparency/public-facing views
  - `/citizen` for citizen flows
  - `/api` for service endpoints
- Clear modularization in `src/lib` (auth, db, policies, observability, queue/workers).
- Good CI baseline in GitHub Actions with migrations, drift checks, tests, build, and E2E.

## System Components
- **Web app**: Next.js 16, React 19, server/client split.
- **Database**: PostgreSQL + PostGIS + Prisma.
- **Queue/workers**: BullMQ + Redis queues with scheduled jobs and DLQ.
- **Auth**: NextAuth credentials, staff/citizen split.
- **Observability**: structured JSON logs + in-memory metrics + Prometheus endpoint.

## Security Assessment
Strengths:
- CSP and baseline security headers in middleware + config.
- API token hashing and scoped authorization checks.
- Login rate limiting with Redis + local fallback.
- Role checks and policy helpers.

Risks:
- CSP allows `style-src 'unsafe-inline'` ([csp.ts](/root/civicmetrix/src/lib/security/csp.ts:8)).
- Rate limiting can fail-open under some Redis/transport conditions ([security/rate-limit.ts](/root/civicmetrix/src/lib/security/rate-limit.ts:58)).
- Contract fragmentation increases chance of inconsistent security error handling.

## Multi-Tenant Safety Review
Strengths:
- RLS migrations are comprehensive and include `FORCE ROW LEVEL SECURITY` on core tables.
- Composite tenant FKs materially reduce cross-tenant reference risk.
- `db()` proxy enforces tenant context and transaction-scoped `set_config`.

Gaps:
- Use of `dbSystem()` for tenant data is widespread and relies on manual `organizationId` scoping.
- Multiple tenant helper styles (`tenantDb` vs `getTenantDb`) create ambiguity.
- Public/session data flows still have mixed tenant-session behavior.

Assessment: **Database-level posture is strong; application-level discipline is inconsistent.**

## Database Architecture
Strengths:
- Rich normalized domain model.
- Strong indexing for operational queries and worker scans.
- PostGIS support with GIST spatial index and location trigger backfill.
- Composite tenant FKs and validated constraints.

Concerns:
- Prisma schema not modeling `location` while runtime SQL depends on it.
- This creates a persistent schema-to-runtime mismatch.

## API Architecture
Strengths:
- Many routes use zod validation.
- Streaming implemented for document retrieval.
- Observability wrapper (`withApiObservability`) gives request lifecycle logs.

Concerns:
- Response shape inconsistency across routes.
- Pagination appears on some public exports (JSON), but not universally standardized.
- Some APIs use direct `dbSystem()` on tenant tables without explicit tenant transaction helper.

## Frontend Architecture
Strengths:
- App Router server loaders feed client visualization components.
- Mapbox initialization is correctly done in `useEffect`.
- Recharts components include empty-data guards.

Concerns:
- Demo/public chart components still emit client console logs.
- Category taxonomy mismatch can reduce usefulness of cluster breakdown:
  - Seed categories: [prisma/seed.ts](/root/civicmetrix/prisma/seed.ts:24)
  - Heatmap cluster category expectations: [IssueHeatmap](/root/civicmetrix/src/components/demo/IssueHeatmap.tsx:78)

## Worker/Queue Architecture
Strengths:
- Good queue partitioning by workload domain.
- Repeatable scheduling and retry/backoff defaults are present.
- DLQ ingestion with threshold health checks and tests.

Concerns:
- Worker logic predominantly uses `dbSystem()` rather than explicit tenant-session wrappers.
- Metrics are in-memory; restart resets counters.

## DevOps & Deployment
Strengths:
- PM2 runtime workflow appears operational.
- CI enforces migrations, drift checks, tests, build, and E2E.
- Docker worker image exists.

Concerns:
- Deployment scripts are simple and mostly imperative (`deploy.sh`), without environment promotion controls.
- No explicit infra-as-code for nginx/runtime process topology in repo.

## Observability
Strengths:
- Structured logs with request/tenant/user context.
- DB query latency + slow query counters.
- API request/error counters and internal metrics endpoint.
- Prometheus metrics endpoint available.

Concerns:
- Metrics are process-local in-memory, not durable or centralized.
- No explicit tracing backend integration.

## Performance Analysis
Strengths:
- Worker and operational indexes are aligned with critical query paths.
- Spatial queries use PostGIS + geometry indexes.
- Public JSON endpoints include cursor/offset patterns.

Concerns:
- Some dashboard loaders fetch multiple datasets in one request path; careful budget needed as data scales.
- Inconsistent tenant/session setup can introduce repeated transaction overhead and debugging complexity.

## Current Maturity Score
- **Overall maturity: 7.6 / 10**
- Architecture: 8.2
- Multi-tenant safety (effective): 7.0
- Database design: 8.5
- API consistency: 6.8
- Security posture: 7.4
- Observability: 7.2
- DevOps readiness: 7.1

## Production Readiness Classification
- **Classification: Conditionally Production-Ready**
- Suitable for controlled production rollout with moderate risk tolerance.
- Not yet at high-assurance readiness for strict government/compliance environments until tenant-access consistency and schema drift are resolved.

## Scaling Forecast
- **Near-term (1x–5x current load)**: should scale with current architecture and index strategy.
- **Mid-term (5x–20x)**: API contract and tenant access standardization becomes mandatory to prevent regression overhead.
- **Long-term (>20x)**: needs durable metrics/tracing, queue SLOs, standardized service contracts, and stronger deployment automation.

## Product Direction Recommendations
1. **Unify tenant access model**
   - Standardize around one tenant-safe API for all tenant data access.
   - Forbid raw `dbSystem()` tenant table access outside explicit system-only workflows.

2. **Fix schema/runtime drift**
   - Add `location` to Prisma schema (or remove raw dependency), then regenerate and align migrations.

3. **API contract unification**
   - Enforce one response envelope (`success/data/error`) and one error taxonomy.

4. **Consolidate rate limiting**
   - Merge limiter modules and define explicit fail-open/fail-closed policy by endpoint criticality.

5. **Harden production hygiene**
   - Remove client-side debug logs in production components.
   - Tighten CSP where feasible.

6. **Strengthen observability**
   - Export persistent metrics to external backend; add distributed tracing.

7. **Expand E2E assertions**
   - Verify non-empty chart/map payloads and tenant-isolation behavior, not just 200 status.

8. **Deployment hardening**
   - Add explicit release checks (health probes + post-deploy synthetic checks + rollback hooks).

