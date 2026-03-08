# GIS / Spatial Audit

## Scope
- PostGIS setup, geometry fields, spatial write/read paths.

## Current State
- PostGIS extension enabled (`20260304160754_add_postgis_spatial_support/migration.sql:1`).
- `IssueReport.location geometry(Point,4326)` is present in schema.
- GIST index exists on `IssueReport.location`.
- Trigger backfills/maintains geometry from latitude/longitude (`backfill_issue_locations/migration.sql`).

## Findings

### 1) Spatial writes duplicated in app code and trigger layer
- Risk Level: **Low**
- Impact: maintenance complexity; two mechanisms can drift.
- Evidence: app-side raw SQL update in `src/app/public/[slug]/report-issue/actions.ts:185-189` and DB trigger in `backfill_issue_locations`.
- Recommended Fix: prefer DB trigger as single source; remove app-side location update once verified.
- Estimated Effort: **Low**

### 2) Spatial queries are parameterized and tenant-filtered
- Risk Level: **Low**
- Impact: positive control.
- Evidence: `src/lib/spatial.ts` uses parameterized `$queryRaw` and `organizationId` predicates.
- Recommended Fix: keep this pattern and add query timeout guards for very large datasets.
- Estimated Effort: **Low**

### 3) Public map surfaces depend on mixed `db`/`dbSystem` tenant context behavior
- Risk Level: **High**
- Impact: affected GIS/public map pages may fail when `db()` is used without tenant context.
- Evidence: e.g., `src/app/public/[slug]/infrastructure/page.tsx:24-53`.
- Recommended Fix: switch public GIS reads to `dbSystem()` with explicit `organizationId` constraints or inject tenant context for public routes.
- Estimated Effort: **Medium**
