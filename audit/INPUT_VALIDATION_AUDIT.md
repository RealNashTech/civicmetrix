# Input Validation Audit

## Scope
- API routes + server actions request parsing and validation discipline.

## Findings

### 1) Validation approach is fragmented (Zod + manual parsing + raw string checks)
- Risk Level: **Medium**
- Impact: inconsistent rejection behavior and higher chance of edge-case bugs.
- Evidence:
  - Zod: `src/app/api/auth/register/route.ts`, `src/app/dashboard/issues/actions.ts`
  - Manual parsing: many dashboard/public actions using `String(formData.get(...))`
- Recommended Fix: define per-domain schemas and shared coercion helpers.
- Estimated Effort: **Medium**

### 2) Server actions handling public issue submission lack full schema hardening
- Risk Level: **High**
- Impact: malformed payload handling is uneven; easier to miss validation on future fields.
- Evidence: `src/app/public/[slug]/report-issue/actions.ts` relies mostly on imperative checks.
- Recommended Fix: single Zod schema for issue submission, including coordinates, file metadata, enum fields.
- Estimated Effort: **Medium**

### 3) Query parameter validation is ad hoc
- Risk Level: **Low**
- Impact: endpoint behavior may vary subtly with malformed params.
- Evidence: manual page/pageSize parsing in reporting APIs.
- Recommended Fix: schema-parse query params with bounded defaults.
- Estimated Effort: **Low**

### 4) Positive: key auth and registration bodies are schema-validated
- Risk Level: **Low**
- Impact: good baseline for credential flows.
- Evidence: Zod schemas in staff/citizen registration and auth credential parsing.
- Recommended Fix: propagate the same standard to all mutating handlers.
- Estimated Effort: **Low**
