# Security Hardening Audit

## Scope
- Secrets/config, headers, rate limiting, authz boundaries, abuse vectors.

## Findings

### 1) Tenant-context mismatch on public/citizen surfaces is a security and availability defect
- Risk Level: **Critical**
- Impact: broken request handling and potential isolation regressions from mixed client use.
- Evidence: `db()` strict tenant requirement (`src/lib/db.ts:43-47`) + middleware exclusion (`middleware.ts:42`) + `db()` calls in `/public/*` and `/citizen/*`.
- Recommended Fix: unify tenant propagation model for all authenticated and slug-scoped paths.
- Estimated Effort: **High**

### 2) RLS not universal across tenant tables
- Risk Level: **High**
- Impact: app-level filter omission can leak cross-tenant data for uncovered tables.
- Recommended Fix: enforce RLS for all tenant data tables and run policy coverage tests.
- Estimated Effort: **High**

### 3) Rate limiting covers only select endpoints
- Risk Level: **Medium**
- Impact: brute-force and abuse surfaces remain on many read-heavy/public endpoints.
- Evidence: route keys limited to 4 buckets (`src/lib/security/rate-limit.ts:6-13`).
- Recommended Fix: global per-IP/per-token limits for public/API routes with route-specific overrides.
- Estimated Effort: **Medium**

### 4) Security headers are present but incomplete/legacy
- Risk Level: **Low**
- Impact: missing modern hardening and policy tuning.
- Evidence: headers set in `next.config.ts`, includes deprecated `X-XSS-Protection`.
- Recommended Fix: add `Permissions-Policy`, tighten CSP by environment, remove deprecated headers.
- Estimated Effort: **Low**

### 5) API token validation performs bcrypt comparison over prefix candidates
- Risk Level: **Low**
- Impact: potential CPU amplification if many active tokens share prefix.
- Recommended Fix: enforce low cardinality per prefix and org-level token limits.
- Estimated Effort: **Low**
