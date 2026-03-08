# CivicMetrix System Map

## Stack
- Next.js App Router + TypeScript
- Prisma ORM on PostgreSQL (PostGIS extension enabled)
- Redis + BullMQ workers
- NextAuth credentials auth (staff + citizen)

## Repository Surface Audited
- `src/app`, `src/lib`, `src/workers`, `prisma`, `tests`, `middleware.ts`, `.github/workflows`, Docker files, scripts

## Routing Structure
- Public marketing: `src/app/(public)`
- Staff dashboard: `src/app/dashboard/**`
- Citizen portal: `src/app/citizen/**`
- Public transparency: `src/app/public/[slug]/**`
- API routes: `src/app/api/**` (11 handlers)
- Public export/API routes: `src/app/public/[slug]/*.{json,csv}/route.ts` (4 handlers)
- Server actions: 16 `actions.ts` files across dashboard/citizen/public

## Auth and Access Flow
- NextAuth credentials providers in `src/lib/auth.ts` for:
  - staff (`staff-credentials`)
  - citizen (`citizen-credentials`)
- Middleware (`middleware.ts`) injects request headers:
  - `x-request-id`
  - `x-civicmetrix-tenant` from JWT token
- Middleware matcher only covers `/dashboard/:path*` and `/api/:path*`.
- `db()` requires tenant context/header (`src/lib/db.ts:43-47`).
- `dbSystem()` bypasses tenant context.

## Multi-Tenant Boundaries (Intended)
- Primary boundary: `organizationId` in application filters.
- Secondary boundary: PostgreSQL RLS via `app.current_tenant` + policies.
- Composite tenant FKs added in migration `20260306000300_composite_tenant_foreign_keys`.

## Worker Architecture
- Entry: `src/workers/index.ts` + `scripts/start-worker.ts`
- Queues:
  - `event-processing`
  - `grant-reminders`
  - `issue-sla`
  - `maintenance-scheduler`
  - `civic-intelligence`
  - `dead-letter`
- Scheduled repeat jobs added in-process at startup.
- Concurrency set to 1 per worker process.

## Database Model Domains
- Core tenant entities: Organization, User, Department, Program, Budget, KPI(+history), Grant(+milestone/deliverable/metric), IssueReport(+comment), Asset, WorkOrder, MaintenanceSchedule
- Governance/compliance: AuditLog, Document, ApiToken, Alert, Insight, CouncilReport
- GIS: District, Ward, ServiceZone, InfrastructureLayer, IssueReport.location geometry
- Citizen: Citizen, CitizenNotification

## High-Level Data Paths
- Staff dashboard read/write: mostly `db()` + `requireStaffUser`
- Public dashboard read: mixed `dbSystem()` and `db()`
- Citizen pages/actions: `requireCitizenSession` + `db()`
- Background processing: workers mostly `dbSystem()`

## Architecture Risks (Summary)
1. **Critical**: `db()` usage in `/public/*` and `/citizen/*` paths that are outside middleware tenant-header injection.
- Impact: runtime failures and broken public/citizen flows; inconsistent tenant-boundary enforcement.
- Evidence: `middleware.ts:42`, `src/lib/db.ts:43-47`, `src/app/public/[slug]/report-issue/actions.ts:54`, `src/app/citizen/dashboard/page.tsx:13`.

2. **High**: Mixed `db()` vs `dbSystem()` patterns create inconsistent security model and make regressions likely.
- Impact: accidental cross-tenant read/write if filters are missed in `dbSystem()` code.

3. **Medium**: Heavy in-memory aggregations in route handlers and pages.
- Impact: response latency growth with tenant size.
