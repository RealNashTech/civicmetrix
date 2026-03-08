# Infrastructure Audit

## Scope
- Containerization, runtime services, observability, operational readiness.

## Findings

### 1) Worker container is single-stage and installs full dependency tree
- Risk Level: **Medium**
- Impact: larger attack surface, slower builds, heavier runtime image.
- Evidence: `Dockerfile.worker:5-8` (`COPY . .`, `npm install`, `npm run build`).
- Recommended Fix: use multi-stage build, `npm ci --omit=dev` for runtime image, non-root user.
- Estimated Effort: **Medium**

### 2) Local compose includes Postgres only (no Redis/service parity)
- Risk Level: **Medium**
- Impact: local/prod behavior drift for workers, queues, and rate limiting.
- Evidence: `docker-compose.yml` defines only `postgres`.
- Recommended Fix: add Redis service and optional worker/web services for parity profiles.
- Estimated Effort: **Low**

### 3) Observability is in-process only
- Risk Level: **Medium**
- Impact: metrics reset on restart; no durable monitoring/tracing pipeline.
- Evidence: `src/lib/observability/metrics.ts` stores counters in memory maps.
- Recommended Fix: export Prometheus/OpenTelemetry metrics and centralize logs.
- Estimated Effort: **Medium**

### 4) Health check endpoint exists but no deeper dependency checks
- Risk Level: **Low**
- Impact: false healthy state during DB/Redis degradation.
- Evidence: `/api/system/health` returns static `ok` response.
- Recommended Fix: add readiness checks for DB, Redis, and queue connectivity.
- Estimated Effort: **Low**
