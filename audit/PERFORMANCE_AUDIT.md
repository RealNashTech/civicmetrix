# Performance and Scalability Audit

## Scope
- Query patterns, in-memory aggregations, caching, worker scan behavior.

## Findings

### 1) Heavy route payload construction uses broad `findMany` + JS aggregation
- Risk Level: **Medium**
- Impact: request latency and memory increase with tenant size.
- Evidence: `src/app/api/city/operations/route.ts`, `src/app/api/executive/weekly-report/route.ts`, multiple dashboard pages.
- Recommended Fix: push aggregations to SQL/materialized views and trim selected fields.
- Estimated Effort: **Medium**

### 2) Public exports and some pages are unbounded
- Risk Level: **Medium**
- Impact: large responses and slow render/API times for big tenants.
- Evidence: JSON/CSV endpoints return full datasets without pagination.
- Recommended Fix: add page/cursor params and streamed exports.
- Estimated Effort: **Medium**

### 3) Worker scan patterns are mostly full-table periodic scans
- Risk Level: **Medium**
- Impact: predictable DB load spikes and slower catch-up as data grows.
- Evidence: grant reminder/SLA/maintenance/intelligence workers use periodic `findMany` windows.
- Recommended Fix: index-aligned cursor scanning and per-tenant sharding strategy.
- Estimated Effort: **Medium**

### 4) Caching exists but short TTL and route-scoped only
- Risk Level: **Low**
- Impact: repeated expensive recomputation under load.
- Evidence: `getOrSetJsonCache(..., 60, ...)` on major APIs.
- Recommended Fix: tune TTLs per data volatility and add cache invalidation on writes where practical.
- Estimated Effort: **Low**

### 5) Positive: operational indexes and materialized view support are present
- Risk Level: **Low**
- Impact: good base for scale-up tuning.
- Evidence: migrations `20260306000500`, `20260306000600`, `grant_pipeline_summary` MV.
- Recommended Fix: continue with `EXPLAIN ANALYZE` regression checks in CI/perf suites.
- Estimated Effort: **Medium**
