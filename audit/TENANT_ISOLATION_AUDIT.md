# Multi-Tenant Isolation Audit

## Scope
- All Prisma access patterns (`db`, `dbSystem`, raw SQL), RLS migrations, route/action boundaries.

## Tenant Isolation Model
- `db()` enforces tenant context via async local storage or `x-civicmetrix-tenant` header (`src/lib/db.ts:29-47`).
- `dbSystem()` bypasses tenant requirement.
- RLS policies exist for many tables (migrations `20260305173000` and `20260306000200`).

## Findings

### 1) Public and citizen surfaces call tenant-required `db()` without guaranteed tenant context
- Risk Level: **Critical**
- Impact: production runtime errors and broken tenant-scoped features; inconsistent enforcement path.
- Evidence:
  - `src/app/public/[slug]/report-issue/actions.ts:54,87,104,139,165,208`
  - `src/app/public/[slug]/report-issue/page.tsx:17,22`
  - `src/app/citizen/dashboard/page.tsx:13,25`
  - `src/app/citizen/dashboard/actions.ts:11`
  - middleware scope excludes `/public/*` and `/citizen/*` (`middleware.ts:42`)
- Recommended Fix: use `dbSystem()` + explicit `organizationId` filters for public/citizen reads, or inject tenant context for these routes before `db()` usage.
- Estimated Effort: **High**

### 2) RLS coverage is incomplete across schema models
- Risk Level: **High**
- Impact: tables without RLS rely solely on app-layer filtering and are vulnerable to future filter omissions.
- Evidence: models include `ApiToken`, `Citizen`, `IssueComment`, `Event`, GIS layers, etc.; RLS-enabled set omits several of these.
- Recommended Fix: extend RLS to all tenant tables and adopt deny-by-default policy posture.
- Estimated Effort: **High**

### 3) `dbSystem()` usage for tenant data is widespread
- Risk Level: **Medium**
- Impact: higher blast radius from a single missed `organizationId` predicate.
- Evidence: API/report/public and worker reads/writes use `dbSystem()` in many files.
- Recommended Fix: reserve `dbSystem()` for bootstrap/global ops; require lint/static checks for tenant filters when `dbSystem()` is used.
- Estimated Effort: **Medium**

### 4) Composite tenant FKs are added as `NOT VALID`
- Risk Level: **Medium**
- Impact: legacy inconsistent rows may remain undetected.
- Evidence: `prisma/migrations/20260306000300_composite_tenant_foreign_keys/migration.sql`.
- Recommended Fix: run backfills, then `VALIDATE CONSTRAINT` in a controlled migration.
- Estimated Effort: **Medium**

## RLS Coverage Snapshot
- RLS enabled tables include: `Organization, User, KPI, Grant, IssueReport, Asset, WorkOrder, AuditLog, Document, Alert, Insight, Department, Program, Budget, StrategicGoal, StrategicObjective, GrantMilestone, GrantDeliverable, MaintenanceSchedule, CouncilReport, CitizenNotification`.
- Not covered by current RLS migrations include: `ApiToken, Citizen, IssueComment, Event, District, Ward, ServiceZone, InfrastructureLayer, KPIHistory, GrantMetric, DepartmentPermission, Dashboard, SLAPolicy`.
