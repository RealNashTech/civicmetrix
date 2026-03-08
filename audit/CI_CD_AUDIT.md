# CI/CD Audit

## Scope
- GitHub Actions workflows, migration safety gates, test coverage profile.

## Workflow Snapshot
- Single workflow: `.github/workflows/ci.yml`
- Stages: install, prisma generate/deploy/status, migration check, drift check, lint, tests, build.

## Findings

### 1) Drift detection step is currently broken for Prisma 7
- Risk Level: **High**
- Impact: CI false negatives/failed pipelines; drift safety gate not reliable.
- Evidence: uses removed flag in `.github/workflows/ci.yml:70`.
- Recommended Fix: update command to current Prisma CLI and configure shadow DB URL.
- Estimated Effort: **Low**

### 2) Existing unit tests are already failing on main logic mismatches
- Risk Level: **High**
- Impact: release friction and confidence loss in quality gates.
- Evidence:
  - `tests/unit/worker-dlq.test.ts` expects timeout option not set in workers.
  - `tests/unit/db-tenant-enforcement.test.ts` expects old error message text.
- Recommended Fix: align implementation/tests and enforce green unit suite before deploy.
- Estimated Effort: **Low**

### 3) E2E coverage is minimal
- Risk Level: **Medium**
- Impact: major runtime regressions (tenant context, auth flows) can pass CI.
- Evidence: only 2 Playwright specs (`tests/e2e`).
- Recommended Fix: add E2E for citizen flows, public report-issue, role authorization, document access boundaries.
- Estimated Effort: **Medium**

### 4) Migration safety checker is limited to one regex
- Risk Level: **Medium**
- Impact: risky migration patterns can pass PR checks.
- Evidence: `scripts/check-migrations.ts`.
- Recommended Fix: broaden static checks + add migration dry-run against production-like snapshot.
- Estimated Effort: **Medium**

## Positive
- CI provisions Postgres + Redis services and runs full lint/test/build sequence.
