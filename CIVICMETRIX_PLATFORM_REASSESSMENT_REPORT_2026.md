# CivicMetrix Platform Reassessment Report 2026

Date: March 9, 2026 (UTC)

## Executive Summary

CivicMetrix is no longer a concept-only civic dashboard. The repository contains a real multi-tenant municipal application with a substantial Prisma domain model, queue-backed background processing, staff dashboards, public transparency pages, data import tooling, and early civic intelligence jobs.

The platform is also not yet stable enough to describe as pilot-ready. The current production deployment on `civicmetrix.com` has a broken root experience returning `500 Internal Server Error`, and the local production runtime is currently reproducible with `InvariantError: The manifests singleton was not initialized`. That runtime instability materially lowers the deployment maturity assessment even though many product and data subsystems are present.

The clearest conclusion from the audit is this:

- CivicMetrix has a broad platform surface area
- Several subsystems are genuinely implemented
- A smaller number are production-grade
- The immediate problem is not feature absence, but runtime stability, operational hardening, and finishing generalized ingestion

## Current Classification

- Maturity score: **61 / 100**
- Classification: **Pre-Production**

This score reflects a strong codebase with meaningful municipal workflow coverage, but a live deployment that is currently unstable at the root route and not yet safe for city pilot commitments without remediation.

## Audit Scope

This reassessment is based on direct review of:

- `src/app`
- `src/components`
- `src/lib`
- `src/workers`
- `prisma`
- `scripts`
- `middleware.ts`
- deployment and runtime behavior observed on March 9, 2026

## Repository Architecture Audit

### Platform Structure

The repository is organized as a monolithic Next.js App Router application with:

- staff dashboards under `src/app/dashboard`
- citizen-facing flows under `src/app/citizen`
- public transparency dashboards under `src/app/public/[slug]`
- API routes under `src/app/api`
- shared business logic in `src/lib`
- BullMQ workers in `src/workers`
- a large Prisma schema and migration history under `prisma`

This is a real platform repository, not a UI shell. The codebase covers municipal operations, public transparency, ingestion, analytics, queue jobs, reporting, and RBAC.

### Subsystem Status Matrix

| Subsystem | Status | Assessment |
| --- | --- | --- |
| Multi-tenant architecture | Implemented, needs hardening | Tenant-scoped models exist across the schema, request headers propagate tenant id, AsyncLocalStorage tenant context exists, and `db()` enforces tenant context. Hardening is still needed because some legacy helpers remain simplistic and tenant safety depends on consistent context propagation. |
| Prisma schema design | Implemented, needs hardening | The schema is broad and municipal-domain aware: organizations, departments, programs, grants, issues, assets, assistance, work orders, reports, RBAC, import sessions, data quality, data sources, and Google integration. The model breadth is strong; operational safety and query discipline still need tightening. |
| Civic issue ingestion | Partially implemented | Public issue submission exists both as a server action flow and an API route. Issues persist and support geolocation. Ingestion is not yet part of the generalized upload/import worker path. |
| Assistance ingestion | Partially implemented | `AssistanceRecord` exists, assistance summary APIs and dashboards exist, and the worker has an assistance handler. The broader upload/import path supports the dataset, but the subsystem still needs reconciliation, operator feedback, and wider dashboard integration. |
| Infrastructure ingestion | Implemented, needs hardening | Infrastructure is the most complete ingestion path. Upload/import creates or resolves registry records and writes snapshots. This is the clearest end-to-end ingestion subsystem in the platform. |
| Grants ingestion | Partially implemented | Grant models, dashboards, compliance views, and a grant worker handler exist. Upload/import persistence exists, but deeper grant normalization, program/department linking, and reporting maturity still need work. |
| Dashboard analytics | Implemented, needs hardening | Staff dashboards span operations, executive views, grants, issues, budgets, assets, reports, and assistance. Analytics refresh workers exist, but runtime stability and consistency are not yet strong enough for production trust. |
| Public transparency dashboards | Implemented, needs hardening | Public pages for KPI, grants, issues, operations, infrastructure, map, programs, council report, and assistance are real. Live production shows the public city dashboard works, but the main site root is failing, which undermines overall platform readiness. |
| Map visualization | Implemented, needs hardening | Mapbox- and Leaflet-based surfaces exist for public and staff routes. Issue heatmaps and public map pages are implemented. The map system is feature-complete enough for demos, but needs resilience and validation work. |
| Worker queue system | Implemented, needs hardening | BullMQ queues, repeatable jobs, dead-letter handling, queue metrics, and multiple workers are implemented. This is a real background processing layer. It still needs deployment discipline, worker supervision, and failure-recovery maturity. |
| Tenant isolation | Implemented, needs hardening | Migration history shows tenant RLS work, composite tenant foreign keys, and request-scoped tenant context. This is materially ahead of a typical prototype. It still requires verification discipline because isolation correctness depends on consistent use of `db()` and tenant-aware transactions. |
| Security middleware | Partially implemented | Middleware injects CSP, request ids, tenant headers, route protection, and global rate limiting. It is useful, but not sufficient as a full security boundary. |
| Authentication | Implemented, needs hardening | NextAuth credential flows exist for staff and citizens, with bcrypt, org-aware login, role mapping, and session enrichment. Authentication is real, but operational controls such as secret management, password policies, and SSO are not government-grade. |
| Rate limiting | Partially implemented | Global rate limiting exists in middleware and login throttling has a local fail-closed fallback. However, the PM2 environment currently uses placeholder Upstash values, and the global limiter is effectively bypassed if Upstash is unavailable. |
| Audit logging | Partially implemented | Immutable audit log writes exist and issue creation records audit entries. The audit surface is not yet comprehensive across high-risk admin, ingest, and configuration actions. |
| Deployment architecture | Partially implemented | The deployment uses Next.js, Prisma, PostgreSQL, PM2, NGINX, and a Linux VPS. It is simple and workable, but lacks release safety, rollback discipline, environment segregation, and runtime health guarantees. |
| Observability | Partially implemented | Structured logging, request metrics, DB latency logging, queue metrics, health/readiness endpoints, and internal metrics are implemented. There is no end-to-end tracing, alert routing, dashboard packaging, or robust incident workflow. |

## Detailed Subsystem Notes

### 1. Multi-Tenant Architecture

Strengths:

- `Organization` is the core tenant root in Prisma
- most major domain tables carry `organizationId`
- tenant context is propagated via request headers and AsyncLocalStorage
- `db()` requires tenant context and wraps transactions with `set_config('app.current_tenant', ...)`
- migration history shows explicit tenant RLS and composite tenant foreign key work

Weaknesses:

- there are multiple tenant helpers (`tenantDb`, `tenant-db`, `tenantClient`, `systemClient`) which increase the chance of inconsistent usage
- some legacy convenience wrappers are shallow compared to the newer tenant-aware DB proxy
- the codebase still relies on discipline, not only database enforcement

Assessment: strong for pre-production, not yet fully hardened.

### 2. Prisma Schema Design

Strengths:

- broad municipal schema with strong domain coverage
- includes grants, budgets, KPI history, issues, infrastructure, assistance, work orders, reports, alerts, roles, API tokens, import sessions, data quality, data sources, and Google integration
- large migration history suggests real iterative development, not a single scaffold pass

Weaknesses:

- the breadth of the schema is ahead of the operational maturity of some runtime paths
- some broad domain areas have UI and schema support but weaker end-to-end workflows

Assessment: one of the strongest assets in the platform.

### 3. Ingestion Systems

Implemented ingestion surfaces:

- uploads
- upload mapping
- import planning
- import sessions
- upload templates
- data source connectors
- Google Sheets preview and sync

What is real:

- queue-backed import execution
- dataset handlers for infrastructure, assistance, and grants
- import session tracking and post-import dashboard refresh

What still needs hardening:

- row-level reconciliation and operator feedback
- deterministic replays and resumability
- stronger lineage and error surfacing
- broader dataset normalization rules

### 4. Dashboard Analytics

The staff dashboard surface is substantial:

- executive
- command center
- city operations
- reports
- grants
- work orders
- assets
- issues
- assistance
- data browser
- system health

This is enough to demonstrate a municipal operations platform, but not enough to declare production readiness while the runtime remains unstable.

### 5. Public Transparency Layer

Verified current state:

- `https://civicmetrix.com/` currently returns `500`
- `https://civicmetrix.com/public/city-of-woodburn` renders successfully
- `https://civicmetrix.com/public/city-of-woodburn/report-issue` renders successfully

What the live public dashboard currently exposes:

- public KPI summary
- grant funding totals
- issue map surface
- civic risk engine messaging
- infrastructure health chart area
- council report link
- public issue reporting flow

Assessment: the public transparency platform is real and demo-capable, but the root-site failure means the live product experience is not stable enough for pilots.

## Production Deployment Audit

### Observed Production Stack

- Next.js App Router
- Prisma
- PostgreSQL
- PM2
- NGINX
- Linux VPS

### Deployment Safety

Status: **Partially implemented**

Evidence:

- deployment instructions exist
- health and readiness checks exist
- migration safety checker exists
- PM2 and NGINX are in place

Risks:

- deploy flow is manual
- no blue/green deployment
- no containerized release isolation
- repeated PM2 restarts have left duplicate stopped process entries
- the current root route is broken in production

### Build Stability

Status: **Moderate**

Evidence:

- full production builds complete successfully
- Prisma client generation is wired into build flow
- route inventory is generated cleanly

Risks:

- the runtime can still fail after a successful build
- the recent `manifests singleton` failure shows the build success signal is not sufficient

### Runtime Stability

Status: **Poor**

Evidence:

- `civicmetrix.com` root returns `500`
- local production runtime reproduces `InvariantError: The manifests singleton was not initialized`
- earlier logs also showed server action mismatch failures

Assessment: this is the largest immediate blocker to pilot readiness.

### Migration Safety

Status: **Partially implemented, good direction**

Evidence:

- `scripts/check-migrations.ts` scans for risky SQL patterns
- migration volume indicates disciplined schema evolution
- explicit tenant and index hardening migrations exist

Risks:

- the checker only covers newer migrations after a date gate
- no formal automated deployment pipeline is visible in-repo

### Environment Configuration

Status: **Needs hardening**

Evidence:

- environment validation requires database, auth, and Redis variables
- PM2 env inspection showed placeholder Upstash REST credentials in use

Risks:

- global rate limiting can effectively disable itself
- placeholder values in production-adjacent config are unacceptable for city pilot claims

### Observability and Logging

Status: **Partially implemented**

Evidence:

- structured JSON logger
- DB latency logging
- internal metrics API
- Prometheus metrics endpoint
- queue size reporting
- health and readiness endpoints

Risks:

- no evidence of external log aggregation
- no on-call alerting integration
- no packaged operational dashboards
- root-cause diagnosis still required manual shell access

### Failure Recovery

Status: **Weak**

Evidence:

- PM2 can restart processes
- NGINX can be reloaded
- queues have retries and dead-letter handling

Risks:

- no automated rollback
- no release isolation
- runtime manifest errors required manual intervention
- root route remains broken after rebuilds

## civicmetrix.com Product Audit

### Public Demo Surface

| Product Surface | Current State | Audit View |
| --- | --- | --- |
| Public dashboards | Live and rendering for Woodburn slug | Demo-capable |
| Grant funding charts | Present on public dashboard | Good demo value, limited evidence of drilldown depth |
| Issue heatmap | Present on public dashboard | Good visual story, needs reliability validation |
| Infrastructure health dashboard | Present on public dashboard | Strong municipal signal, likely still demo-grade |
| Civic risk engine | Present with active messaging | Early productization, not yet decision-grade |
| Citizen issue reporting | Live report form available | Useful pilot workflow, needs moderation and SLA rigor |
| Program dashboards | Public program routes exist | Functional surface, maturity varies by dataset depth |

### Product Completeness for City Pilots

Current conclusion: **not ready for formal city pilots today**

Reasons:

- the main production homepage is down
- runtime stability is currently below pilot expectations
- observability requires shell-level debugging
- ingestion breadth is ahead of operational reliability
- security and deployment posture are not yet strong enough for external municipal commitments

What is true despite that:

- the platform is credible as a serious pre-production municipal operations product
- the public Woodburn demo is strong enough to support investor, partner, and design-partner conversations
- the codebase has enough substance to justify a stabilization-first roadmap instead of a rewrite

## Platform Maturity Score

### Score

**61 / 100**

### Classification

**Pre-Production**

### Why Not Higher

- live root-route failure
- reproducible Next.js runtime instability
- deployment process lacks safety rails
- observability is incomplete
- global rate limiting posture is not strong enough
- generalized ingestion is still incomplete from an operator perspective

### Why Not Lower

- the schema is broad and real
- multi-tenant patterns are substantive
- worker architecture is real
- public and staff surfaces are extensive
- assistance, grants, issues, assets, reports, and connectors are more than prototypes

## Recommended Priority Order

1. Stabilize the production runtime and remove the root-route `500`.
2. Harden deployment workflow, PM2 process discipline, and rollback safety.
3. Fix environment and rate-limit posture, especially placeholder external-service config.
4. Expand observability so runtime issues do not require direct shell debugging.
5. Finish generalized ingestion reliability, reconciliation, and operator feedback.
6. Only after stabilization, expand civic intelligence and cross-dataset automation.

## Final Assessment

CivicMetrix is a substantial civic data platform in pre-production, not a concept prototype. Its strongest assets are the multi-tenant domain model, queue-backed processing, and breadth of municipal workflows. Its weakest area is operational reliability. The correct near-term strategy is not feature expansion first. It is platform stabilization, deployment hardening, and data-ingestion reliability work until the live environment is trustworthy enough for municipal pilots.
