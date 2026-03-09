# CivicMetrix Platform Reassessment Report 2026

## Executive Summary

CivicMetrix is a multi-tenant civic operations platform built on Next.js 16, Prisma, PostgreSQL, Redis-backed BullMQ workers, PM2, and NGINX. The current production platform is no longer a prototype-grade dashboard. It is an integrated municipal operations environment that combines internal administrative workflows, public transparency publishing, background intelligence processing, tenant-aware APIs, and file or connector-driven ingestion pipelines.

The live production runtime currently serves from a Next.js App Router application behind NGINX, managed by PM2. Health verification completed successfully against both `http://localhost:3000` and `http://localhost:3000/api/health`, with PM2 showing a single stable `civicmetrix` process online. The production deployment workflow is standardized around `npm run deploy:prod`, which clears `.next`, runs a Webpack-based production build, and restarts the PM2 application.

From an architecture perspective, CivicMetrix has matured into four primary product pillars:

1. Internal municipal operations and administrative dashboards
2. Public transparency dashboards and citizen issue reporting
3. Structured and semi-structured data ingestion pipelines
4. A background civic intelligence engine that produces metrics, insights, and operational signals

The most important conclusion of this reassessment is that the platform has real breadth. It supports grants, KPIs, budgets, documents, issues, work orders, infrastructure condition, public dashboards, role-aware administration, scheduled reports, external data connectors, and automated intelligence workers. The next phase should not be about proving viability. It should be about product hardening, workflow depth, enterprise controls, and release governance.

## Platform Overview

CivicMetrix is organized as a single Next.js App Router codebase with tenant-aware database execution, API routes for operational workflows, a parallel worker runtime, and public-facing dashboards generated per organization slug.

At a functional level, the platform provides:

- Staff-facing dashboards for operations, grants, KPI performance, audit, work orders, assistance, data quality, reports, and system health
- Citizen-facing issue reporting and citizen authentication surfaces
- Public dashboards for KPIs, grants, departments, infrastructure, issues, programs, operations, performance, and transparency views
- Upload-driven and connector-driven ingestion for structured civic datasets
- Analytics and intelligence pipelines that derive risk, trend, anomaly, and cluster insights
- Metrics and health endpoints for runtime monitoring and operational diagnostics

The platform is strongly oriented toward local government operating workflows rather than generic BI alone. It is designed to combine governance, operations, public transparency, and machine-generated signals in one tenant-scoped system.

## Current Production Runtime

The current production environment consists of:

- NGINX as the public-facing reverse proxy
- PM2 as the process manager and restart controller
- Next.js 16.1.6 as the web application runtime
- Prisma Client and Prisma schema management for data access
- PostgreSQL as the system of record
- Redis and BullMQ for queued background work

Production characteristics verified from the running environment:

- PM2 process name: `civicmetrix`
- PM2 status: `online`
- Runtime memory observed during verification: approximately 55 MB
- Local root endpoint health: `200 OK`
- Local API health endpoint: `200 OK`
- External production endpoints: returning `200 OK`

PM2 persistence is enabled through the generated `pm2-root.service` systemd unit, and the active process list is saved through `pm2 save`. The process configuration includes:

- `autorestart: true`
- `max_restarts: 10`
- `restart_delay: 5000`

The standardized production deployment workflow is:

```bash
npm run deploy:prod
```

That script executes:

```bash
rm -rf .next && NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build && pm2 restart civicmetrix
```

This is the current operational baseline for production deployment.

## Text Architecture Diagram

The current platform can be described as the following logical architecture:

1. End users interact through browser clients
   - Internal staff dashboards
   - Citizen-facing pages
   - Public transparency dashboards

2. Requests enter through NGINX
   - TLS termination
   - Reverse proxy to the Next.js application on port 3000

3. PM2 supervises the application runtime
   - Starts the Next.js production server
   - Restarts on failure
   - Persists process state across reboots

4. The Next.js application provides
   - App Router page rendering
   - API endpoints under `src/app/api`
   - Tenant-aware internal dashboards
   - Public transparency pages
   - Authentication flows

5. Prisma mediates data access to PostgreSQL
   - Organization-scoped entities
   - Cross-domain municipal data
   - Reporting and analytics persistence

6. Redis plus BullMQ provide worker queues
   - Event processing
   - Upload import processing
   - Data source synchronization
   - Civic intelligence jobs
   - Reminder and scheduling jobs

7. Worker services produce derived platform state
   - Data quality metrics
   - Infrastructure risks and trends
   - KPI trend insights
   - Issue anomaly and cluster insights
   - Scheduled reports and reminders

8. Public transparency pages expose selected tenant data
   - Dashboard views
   - Charts
   - CSV and JSON open data endpoints
   - Citizen issue submission

## Core Modules

### Application Surface

The main application surface under `src/app` includes:

- `api`
- `auth`
- `citizen`
- `dashboard`
- `public`
- `demo`

This structure reflects a product divided into internal staff operations, citizen engagement, and public transparency.

### UI Component Domains

The component library is grouped into operational areas:

- `assistance`
- `charts`
- `dashboard`
- `datasources`
- `intelligence`
- `layout`
- `maps`
- `public`
- `ui`

This is consistent with a product that has custom visualization, mapping, and operational dashboard requirements rather than a purely generic component set.

### Core Platform Services

The `src/lib` directory includes platform service layers for:

- API handling and error normalization
- Authentication and role authorization
- Database and tenant scoping
- Datasource connectors
- Upload parsing, mapping, validation, and templates
- Intelligence and insight generation
- Metrics and observability
- Notifications
- Security and rate limiting
- Reports and public data composition

This service organization is one of the clearest indicators that CivicMetrix has already evolved beyond a simple dashboard application into a modular municipal platform.

## API Surface

The active API surface is organized into the following top-level groups:

- `assistance`
- `auth`
- `citizen`
- `city`
- `datasources`
- `documents`
- `executive`
- `google`
- `health`
- `intelligence`
- `internal`
- `kpi`
- `metrics`
- `public`
- `quality`
- `ready`
- `reports`
- `risk`
- `system`
- `uploads`
- `work-orders`

Operational capabilities exposed through these APIs include:

- Authentication and organization registration
- Public issue reporting
- City operations summaries
- Executive reporting
- Datasource management and synchronization
- Google Sheets integration
- Upload planning, mapping, import orchestration, and import history
- Data quality inspection
- Infrastructure risk and trend inspection
- Metrics export for observability
- System and health checks
- Work order creation and management

This API design indicates that the platform is not only page-driven. It is structured as an operational service layer that can support future API consumers, automation, and integrations.

## Database and Multi-Tenant Design

The Prisma schema defines a broad municipal operating model centered on `Organization` as the tenant root. Nearly every major entity is organization-scoped.

Core tenant-scoped domains include:

- Departments
- Programs
- Budgets
- Dashboards
- KPIs and KPI history
- Grants and milestones
- Alerts
- Documents
- Roles and users
- Citizens and citizen notifications
- Issue reports and comments
- Assets, maintenance schedules, and work orders
- Insights, operational insights, and system metrics
- Import sessions, dataset types, templates, and data quality metrics
- Data sources and Google integrations
- Assistance records
- Infrastructure assets, snapshots, risks, and trends

Tenant isolation is reinforced in the runtime through `tenantDb`, which sets `app.current_tenant` inside database transactions before executing tenant-scoped work. The schema and transaction design strongly suggest a shared-database multi-tenant architecture with application-managed tenant scoping and organization-based authorization.

This model is sufficient for a production civic SaaS, but it will benefit from more explicit tenant governance documentation, automated tenant-level auditing, and stricter consistency around all data access paths.

## Worker Systems

The worker layer is substantial and production-relevant. Current worker files include:

- `civic-intelligence-worker.ts`
- `data-source-sync.ts`
- `event-worker.ts`
- `grant-deadline-worker.ts`
- `grant-pipeline-refresh-worker.ts`
- `grant-reminder-worker.ts`
- `issue-sla-worker.ts`
- `maintenance-scheduler-worker.ts`
- `report-scheduler.ts`
- `upload-import-worker.ts`
- `work-order-generator.ts`

Additional intelligence workers exist under `src/workers/intelligence`:

- `grant-risk-worker.ts`
- `issue-anomaly-worker.ts`
- `kpi-trend-worker.ts`
- `spatial-cluster-worker.ts`

The queue layer defined in `src/lib/queue.ts` provisions:

- `event-processing`
- `grant-reminders`
- `issue-sla`
- `maintenance-scheduler`
- `civic-intelligence`
- `data-source-sync`
- `dead-letter`

Worker orchestration in `src/workers/index.ts` schedules repeatable jobs, instruments queue behavior, and records worker metrics. This means the worker system is not incidental; it is a first-class subsystem.

## Data Ingestion Pipelines

The platform contains two main ingestion patterns.

### 1. Upload-driven ingestion

The upload ingestion pipeline consists of:

- File upload intake: `src/app/api/uploads/route.ts`
- Upload planning: `src/app/api/uploads/plan/route.ts`
- Auto-mapping: `src/lib/uploads/autoMapColumns.ts`
- Parsing: `src/lib/uploads/parser.ts`
- Row normalization: `src/lib/uploads/normalizeRows.ts`
- Validation: `src/lib/uploads/validateRows.ts` and `validateUpload.ts`
- Mapping templates: `src/lib/uploads/templates.ts`
- Import session persistence: `ImportSession` model
- Queue handoff: `eventProcessingQueue.add("upload-import", ...)`
- Worker persistence by dataset type: `src/workers/handlers/*`

The upload subsystem already supports:

- Template suggestion
- Field-to-column mapping
- Import session status tracking
- Validation and partial failure handling
- Data quality metric generation

### 2. External connector-driven ingestion

The external connector path consists of:

- Datasource registration: `src/app/api/datasources/connect/route.ts`
- Datasource listing and deletion: `src/app/api/datasources/*`
- Sync trigger API: `src/app/api/datasources/[id]/sync/route.ts`
- Source connectors:
  - Google Sheets
  - Microsoft Excel
- Data hashing for change detection: `src/lib/datasources/hashRows.ts`
- Row normalization and validation reuse from upload pipeline
- Import session creation and upload-import queue handoff from `data-source-sync.ts`

This is a strong design choice: external connectors feed into the same validation and import abstractions as manual uploads, reducing architectural duplication.

## Civic Intelligence Engine

The civic intelligence layer is one of the platform's differentiators.

It currently includes:

- Infrastructure risk analysis
- Infrastructure trend analysis
- Grant risk detection
- KPI trend anomaly detection
- Issue anomaly detection
- Spatial clustering and service cluster insight generation
- Operational insight persistence
- Dashboard refresh triggers after imports
- System metric recording for worker runtime and failures

Primary implementation components:

- `src/workers/civic-intelligence-worker.ts`
- `src/workers/intelligence/grant-risk-worker.ts`
- `src/workers/intelligence/kpi-trend-worker.ts`
- `src/workers/intelligence/issue-anomaly-worker.ts`
- `src/workers/intelligence/spatial-cluster-worker.ts`
- `src/lib/intelligence/analyzeInfrastructureRisk.ts`
- `src/lib/intelligence/analyzeInfrastructureTrends.ts`
- `src/lib/insights/create-insight.ts`
- `src/lib/civic-insights.ts`
- `src/lib/city-health.ts`
- `src/lib/kpi-trends.ts`
- `src/lib/issue-hotspots.ts`

The intelligence layer currently produces both machine-readable data and user-facing narrative or alert surfaces. That is the correct direction for a municipal operating platform, because civic users need decision support, not only raw analytics.

## Dashboard Systems

The internal dashboard environment is broad and functionally segmented. Current dashboard modules include:

- Alerts
- Assets
- Assistance
- Audit
- Browser
- Budgets
- City operations
- Command center
- Data
- Data browser
- Datasources
- Departments
- Documents
- Executive
- Goals
- Grant compliance
- Grants
- Insights
- Issues
- KPI
- Map
- Operations
- Organization
- Programs
- Reports
- System health
- Work orders

These dashboards indicate that CivicMetrix is already positioned as a unified municipal control plane rather than a single-purpose analytics portal.

## Public Transparency System

The public transparency system under `src/app/public/[slug]` is extensive. It includes:

- Main public dashboard
- Assistance
- Budget
- Council report
- Departments and department detail
- Goals
- Grants
- Infrastructure
- Issues
- KPI and KPIs
- Map
- Operations
- Performance
- Programs and program detail
- Report issue
- Transparency

Open-data style exports are already present:

- Grants CSV
- Grants JSON
- Issues CSV
- Issues JSON
- KPIs CSV
- KPIs JSON

Citizen issue reporting is supported through:

- Public route: `src/app/public/[slug]/report-issue`
- API endpoint: `src/app/api/public/report-issue/route.ts`

This means CivicMetrix already supports one of the strongest value propositions for local governments: a shared internal and public operating picture sourced from the same underlying tenant data.

## Observability and Health Monitoring

The platform includes multiple layers of observability:

- `/api/health`
- `/api/system/health`
- `/api/metrics`
- `/api/internal/metrics`
- PM2 process supervision
- PM2 startup persistence
- Queue metrics instrumentation
- API request and error observability
- Worker runtime and failure metrics
- System metric persistence to the database

Relevant implementation areas include:

- `src/lib/observability/*`
- `src/lib/metrics/*`
- `src/lib/system-metrics.ts`
- `src/app/dashboard/system/health/page.tsx`

This is sufficient for internal operational visibility, but not yet a complete enterprise observability posture. There is room for stronger alert routing, retention policy documentation, SLO definitions, and incident response instrumentation.

## Current Limitations

The current platform is credible and broad, but several limitations remain.

### Product and feature limitations

- No first-class billing or subscription management layer
- No procurement or vendor management domain
- No dedicated policy/configuration admin center for tenant administrators
- No feature-flag or release ring system
- No explicit workflow engine for approval chains
- No formal external integration marketplace beyond current connectors

### Technical and operational limitations

- Shared codebase complexity is growing quickly
- Worker and queue behavior need stronger operational documentation
- Historical PM2 logs still contain stale error lines that can confuse operational reviews
- Tenant access discipline exists, but a full tenant safety audit should continue
- There is no dedicated infrastructure-as-code repository in the application tree
- Release governance depends on scripts and PM2 rather than a broader staged deployment framework

### Documentation limitations before this rebuild

- Existing documents no longer matched the live architecture
- Production hardening and deployment workflow were under-documented
- Platform scope had outgrown prior narrative materials

## Recommended Roadmap

The next roadmap should assume the platform is already viable and should focus on safety, depth, and enterprise readiness.

### Near-term priorities

- Formalize release governance and rollback procedures
- Extend deployment safety checks and post-deploy verification
- Add stronger tenant admin and settings workflows
- Expand system-health visibility and alerting
- Improve operational playbooks for workers and imports

### Product expansion priorities

- Deepen work-order lifecycle orchestration
- Expand assistance and program impact analytics
- Introduce capital planning and asset renewal forecasting
- Add more connector types beyond current spreadsheet-centric sources
- Improve scheduled reporting and executive narrative outputs

### Enterprise-readiness priorities

- Stronger audit export and compliance workflows
- SSO and enterprise identity integration options
- Granular admin governance controls
- Better configuration and secrets management documentation
- Formal incident response, backup, and disaster recovery procedures

## Final Assessment

CivicMetrix is currently a real municipal operating platform with meaningful production architecture, not a lightweight demo system. Its strongest differentiators are:

- tenant-scoped internal and public data surfaces
- integrated ingestion and normalization pipelines
- a worker-backed civic intelligence engine
- broad municipal workflow coverage across grants, KPIs, issues, assets, and work orders

The platform's next stage is not conceptual validation. It is operational hardening, product depth, enterprise controls, and disciplined roadmap execution.
