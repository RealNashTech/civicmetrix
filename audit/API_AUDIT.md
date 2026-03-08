# API Architecture Audit

## Scope
- API routes, auth gates, token scopes, pagination, error/response consistency.

## Findings

### 1) API response contract is inconsistent
- Risk Level: **Medium**
- Impact: clients must special-case route-specific payload/error shapes.
- Evidence: routes mostly return `{ error: string }`, while helper wrappers exist (`src/lib/api/error-response.ts`, `src/lib/api/success-response.ts`) but are not consistently used.
- Recommended Fix: enforce a shared response envelope and error code taxonomy.
- Estimated Effort: **Medium**

### 2) Missing standardized input schema validation on query params
- Risk Level: **Medium**
- Impact: coercion edge cases and inconsistent guardrails.
- Evidence: manual `parseInt` in `src/app/api/city/operations/route.ts:33-43` and `executive/weekly-report` with no Zod schema.
- Recommended Fix: centralize request parsing/validation (query/body/form) with shared validators.
- Estimated Effort: **Medium**

### 3) Incomplete observability wrapping across API routes
- Risk Level: **Low**
- Impact: missing request metrics/trace IDs for some handlers.
- Evidence: `src/app/api/reports/council/route.ts` is not wrapped by `withApiObservability` unlike most routes.
- Recommended Fix: wrap all route handlers via standard adapter.
- Estimated Effort: **Low**

### 4) Pagination not uniformly applied
- Risk Level: **Medium**
- Impact: unbounded payloads from JSON/CSV/public endpoints as data grows.
- Evidence: public export routes return all rows (e.g., `src/app/public/[slug]/kpis.json/route.ts`).
- Recommended Fix: add pagination defaults/caps and streaming exports for large datasets.
- Estimated Effort: **Medium**

### 5) Authorization patterns are generally strong for sensitive APIs
- Risk Level: **Low**
- Impact: positive baseline.
- Evidence: `authorizeStaffOrApiScope` used in key APIs (`city/operations`, `executive/weekly-report`, `internal/metrics`).
- Recommended Fix: continue via policy middleware to reduce per-route drift.
- Estimated Effort: **Low**
