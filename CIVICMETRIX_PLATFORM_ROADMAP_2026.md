# CivicMetrix Platform Roadmap 2026

Date: March 9, 2026 (UTC)

## Strategic Starting Point

This roadmap replaces earlier documents that assumed the platform was closer to pilot readiness than current evidence supports.

Current verified position:

- maturity score: **61 / 100**
- classification: **Pre-Production**
- public Woodburn demo works
- live root site is currently broken with `500 Internal Server Error`
- generalized ingestion exists, but runtime and deployment stability are the immediate blockers

The roadmap therefore shifts from feature expansion first to stabilization first.

## 2026 Roadmap Summary

### Phase 1 - Platform Stabilization

Objective: make the current platform reliable enough to support internal operations, partner demos, and controlled design-partner use without recurring production breakage.

Priority outcomes:

- eliminate the current Next.js runtime failure on `/`
- make production deploys repeatable and safe
- establish reliable runtime diagnostics
- close environment and rate-limit configuration gaps
- clean up PM2 process lifecycle and recovery behavior

Core workstreams:

1. Runtime stability
   - resolve the `Invariant: The manifests singleton was not initialized` failure
   - remove server action / manifest mismatch behavior from release flow
   - add release verification against `/`, `/api/health`, `/api/ready`, and a public dashboard slug

2. Deployment safety
   - standardize a single PM2 process name and process lifecycle
   - add pre-start cleanup and post-build validation
   - document rollback procedure and test it
   - prevent mixed-build asset/runtime states

3. Environment hardening
   - replace placeholder Upstash configuration in deployed environments
   - verify production secrets, OAuth values, and queue configuration
   - separate development, staging, and production expectations

4. Observability
   - add a stable incident-debug workflow
   - expose actionable dashboarding for API errors, DB latency, queue lag, and worker failures
   - add alert thresholds for repeated 5xx errors and dead-letter growth

5. Security and reliability hardening
   - ensure all public and API-facing rate limits fail closed where appropriate
   - expand audit logging coverage for admin, ingest, datasource, and reporting actions
   - review public metrics exposure and internal metrics access boundaries

Exit criteria:

- `civicmetrix.com/` returns 200 consistently
- no manifest mismatch/runtime singleton errors after clean deploy
- deploy checks cover homepage, public dashboard, health, ready, and metrics paths
- worker, Redis, and DB health are visible without shell access

### Phase 2 - Universal Data Ingestion Engine

Objective: convert the current import and connector framework into a dependable municipal ingestion product.

Current baseline already in place:

- upload parsing for CSV/XLSX/ODS
- preview, column mapping, planning, and import APIs
- `ImportSession`
- template persistence
- `DataSource` connectors
- Google Sheets integration
- worker-backed ingestion

2026 expansion goals:

1. Complete dataset coverage
   - harden infrastructure ingestion
   - normalize grants ingestion
   - normalize assistance ingestion
   - bring civic issue dataset ingestion into the same ingestion framework where appropriate

2. Operator-grade import UX
   - row-level failure reporting
   - import reconciliation summaries
   - deterministic re-run and replay support
   - mapping confidence and validation feedback

3. Connector maturity
   - improve Microsoft Excel parity with Google Sheets
   - add sync history and failure diagnostics
   - show last successful sync, change detection, and stale-source warnings

4. Data quality controls
   - stronger dataset quality scoring
   - duplicate detection
   - schema drift alerts
   - import policy enforcement by dataset type

Exit criteria:

- infrastructure, grants, and assistance imports are consistently end-to-end
- datasource syncs are observable and replayable
- staff can diagnose failed imports without shell or DB access

### Phase 3 - Civic Intelligence Engine

Objective: turn the current analytics workers into decision-support systems that materially help city staff prioritize work.

Current baseline already in place:

- infrastructure risk analysis
- infrastructure trends
- KPI trend worker
- issue anomaly worker
- spatial cluster worker
- grant risk worker
- dashboard refresh worker

2026 expansion goals:

1. Productize intelligence outputs
   - surface worker outputs directly in dashboards and reports
   - tie insights to operational actions, not just passive displays

2. Cross-dataset reasoning
   - combine issues, assets, grants, and assistance geography
   - detect recurring civic hotspots, underperforming programs, and infrastructure-risk clusters

3. Narrative and executive intelligence
   - improve council reports and executive briefings
   - generate readable summaries tied to actual municipal metrics

4. Trust and explainability
   - provide evidence trails for recommendations
   - show source dataset lineage for major insights
   - avoid black-box decision outputs

Exit criteria:

- intelligence outputs are visible, attributable, and actionable
- reports and dashboards can explain why a recommendation was produced
- civic intelligence meaningfully improves prioritization workflows

### Phase 4 - Government Deployment Hardening

Objective: move from pre-production software to a platform that can survive formal pilot security review and operational scrutiny.

Core workstreams:

1. Environment and release governance
   - staged environments
   - migration discipline
   - explicit rollback pathways
   - controlled release promotion

2. Security posture
   - expanded audit coverage
   - stronger secrets handling and rotation guidance
   - hardened public API exposure
   - clearer tenant-boundary verification for all critical flows

3. Reliability posture
   - restart and failure-recovery runbooks
   - queue back-pressure handling
   - dead-letter operational procedures
   - verified backup and restore workflow

4. Government pilot readiness package
   - architecture diagrams
   - operational runbooks
   - data-handling documentation
   - pilot support and incident-response playbooks

Exit criteria:

- deployment process is safe and repeatable
- failure recovery is documented and tested
- audit, observability, and tenant isolation posture are credible in external review

## Roadmap Prioritization

Recommended execution order:

1. Phase 1 - Platform Stabilization
2. Phase 2 - Universal Data Ingestion Engine
3. Phase 3 - Civic Intelligence Engine
4. Phase 4 - Government Deployment Hardening

This order matters. CivicMetrix already has enough product breadth for serious municipal software conversations. The platform does not need more surface area before it needs stability.

## 2026 Decision Rule

Use this rule for all roadmap decisions:

> If a feature expands product breadth but does not improve stability, ingest reliability, or operator trust, it is lower priority than Phase 1 and Phase 2 work.

## Closing View

The platform has enough substance to justify continued investment. It does not yet have enough operational stability to justify city pilot promises. The 2026 roadmap should therefore be judged first by whether CivicMetrix becomes reliable, diagnosable, and safely deployable, and only second by how many new product modules are added.
