# Architecture Tenant Access Audit

Generated from a full repository scan for: `db()`, `dbSystem()`, `tenantDb()`, `new PrismaClient()`, `prisma.` and transaction helpers.

## Summary Counts

- Total `db()` calls: **222**
- Total `dbSystem()` calls: **122**
- Total `tenantDb()` calls: **25**
- Total direct Prisma usages (`new PrismaClient` + `prisma.`): **10**

## A) SAFE TENANT CONTEXT

Includes tenant-scoped access (`tenantDb()`), proxy-enforced tenant access (`db()`), and tenant-safe transaction wrappers (`db().$transaction()`, `client.$transaction()` inside `tenantDb` helper).

| File | Line | Function Used | Classification |
|---|---:|---|---|
| src/app/api/city/operations/route.ts | 75 | `db()` | SAFE |
| src/app/api/city/operations/route.ts | 90 | `db()` | SAFE |
| src/app/api/city/operations/route.ts | 93 | `db()` | SAFE |
| src/app/api/city/operations/route.ts | 111 | `db()` | SAFE |
| src/app/api/city/operations/route.ts | 128 | `db()` | SAFE |
| src/app/api/city/operations/route.ts | 142 | `db()` | SAFE |
| src/app/api/city/operations/route.ts | 145 | `db()` | SAFE |
| src/app/api/city/operations/route.ts | 155 | `db()` | SAFE |
| src/app/api/city/operations/route.ts | 171 | `db()` | SAFE |
| src/app/api/city/operations/route.ts | 175 | `db()` | SAFE |
| src/app/api/documents/[id]/route.ts | 27 | `db()` | SAFE |
| src/app/api/documents/upload/route.ts | 79 | `db()` | SAFE |
| src/app/api/executive/weekly-report/route.ts | 43 | `db()` | SAFE |
| src/app/api/executive/weekly-report/route.ts | 48 | `db()` | SAFE |
| src/app/api/executive/weekly-report/route.ts | 60 | `db()` | SAFE |
| src/app/api/executive/weekly-report/route.ts | 63 | `db()` | SAFE |
| src/app/api/executive/weekly-report/route.ts | 68 | `db()` | SAFE |
| src/app/api/executive/weekly-report/route.ts | 73 | `db()` | SAFE |
| src/app/api/executive/weekly-report/route.ts | 78 | `db()` | SAFE |
| src/app/api/kpi/[id]/history/route.ts | 43 | `db()` | SAFE |
| src/app/api/kpi/[id]/history/route.ts | 55 | `db()` | SAFE |
| src/app/api/work-orders/route.ts | 40 | `tenantDb()` | SAFE |
| src/app/api/work-orders/route.ts | 97 | `tenantDb()` | SAFE |
| src/app/api/work-orders/route.ts | 200 | `tenantDb()` | SAFE |
| src/app/dashboard/alerts/actions.ts | 17 | `db()` | SAFE |
| src/app/dashboard/alerts/actions.ts | 36 | `db()` | SAFE |
| src/app/dashboard/alerts/page.tsx | 30 | `db()` | SAFE |
| src/app/dashboard/assets/actions.ts | 41 | `db()` | SAFE |
| src/app/dashboard/assets/actions.ts | 56 | `db()` | SAFE |
| src/app/dashboard/assets/map/page.tsx | 16 | `db()` | SAFE |
| src/app/dashboard/assets/page.tsx | 23 | `db()` | SAFE |
| src/app/dashboard/assets/page.tsx | 32 | `db()` | SAFE |
| src/app/dashboard/audit/page.tsx | 14 | `db()` | SAFE |
| src/app/dashboard/budgets/actions.ts | 42 | `db()` | SAFE |
| src/app/dashboard/budgets/actions.ts | 54 | `db()` | SAFE |
| src/app/dashboard/budgets/actions.ts | 97 | `db()` | SAFE |
| src/app/dashboard/budgets/actions.ts | 106 | `db()` | SAFE |
| src/app/dashboard/budgets/actions.ts | 123 | `db()` | SAFE |
| src/app/dashboard/budgets/actions.ts | 156 | `db()` | SAFE |
| src/app/dashboard/budgets/actions.ts | 170 | `db()` | SAFE |
| src/app/dashboard/budgets/page.tsx | 21 | `db()` | SAFE |
| src/app/dashboard/budgets/page.tsx | 25 | `db()` | SAFE |
| src/app/dashboard/city-operations/page.tsx | 42 | `db()` | SAFE |
| src/app/dashboard/city-operations/page.tsx | 53 | `db()` | SAFE |
| src/app/dashboard/city-operations/page.tsx | 66 | `db()` | SAFE |
| src/app/dashboard/city-operations/page.tsx | 70 | `db()` | SAFE |
| src/app/dashboard/city-operations/page.tsx | 82 | `db()` | SAFE |
| src/app/dashboard/city-operations/page.tsx | 101 | `db()` | SAFE |
| src/app/dashboard/city-operations/page.tsx | 109 | `db()` | SAFE |
| src/app/dashboard/command-center/page.tsx | 75 | `db()` | SAFE |
| src/app/dashboard/command-center/page.tsx | 86 | `db()` | SAFE |
| src/app/dashboard/command-center/page.tsx | 102 | `db()` | SAFE |
| src/app/dashboard/command-center/page.tsx | 116 | `db()` | SAFE |
| src/app/dashboard/command-center/page.tsx | 136 | `db()` | SAFE |
| src/app/dashboard/command-center/page.tsx | 153 | `db()` | SAFE |
| src/app/dashboard/command-center/page.tsx | 167 | `db()` | SAFE |
| src/app/dashboard/command-center/page.tsx | 171 | `db()` | SAFE |
| src/app/dashboard/command-center/page.tsx | 175 | `db()` | SAFE |
| src/app/dashboard/command-center/page.tsx | 179 | `db()` | SAFE |
| src/app/dashboard/command-center/page.tsx | 187 | `db()` | SAFE |
| src/app/dashboard/data/page.tsx | 129 | `tenantDb()` | SAFE |
| src/app/dashboard/departments/actions.ts | 18 | `db()` | SAFE |
| src/app/dashboard/departments/actions.ts | 51 | `db()` | SAFE |
| src/app/dashboard/departments/actions.ts | 68 | `db()` | SAFE |
| src/app/dashboard/departments/actions.ts | 79 | `db()` | SAFE |
| src/app/dashboard/departments/actions.ts | 109 | `db()` | SAFE |
| src/app/dashboard/departments/actions.ts | 126 | `db()` | SAFE |
| src/app/dashboard/departments/actions.ts | 126 | `db().$transaction()` | SAFE |
| src/app/dashboard/departments/page.tsx | 20 | `db()` | SAFE |
| src/app/dashboard/documents/page.tsx | 13 | `db()` | SAFE |
| src/app/dashboard/executive/briefing/page.tsx | 21 | `db()` | SAFE |
| src/app/dashboard/executive/briefing/page.tsx | 25 | `db()` | SAFE |
| src/app/dashboard/executive/briefing/page.tsx | 31 | `db()` | SAFE |
| src/app/dashboard/executive/briefing/page.tsx | 35 | `db()` | SAFE |
| src/app/dashboard/executive/briefing/page.tsx | 39 | `db()` | SAFE |
| src/app/dashboard/executive/page.tsx | 31 | `db()` | SAFE |
| src/app/dashboard/executive/page.tsx | 34 | `db()` | SAFE |
| src/app/dashboard/executive/page.tsx | 38 | `db()` | SAFE |
| src/app/dashboard/executive/page.tsx | 42 | `db()` | SAFE |
| src/app/dashboard/executive/page.tsx | 46 | `db()` | SAFE |
| src/app/dashboard/executive/page.tsx | 50 | `db()` | SAFE |
| src/app/dashboard/goals/actions.ts | 21 | `db()` | SAFE |
| src/app/dashboard/goals/actions.ts | 57 | `db()` | SAFE |
| src/app/dashboard/goals/actions.ts | 70 | `db()` | SAFE |
| src/app/dashboard/goals/actions.ts | 83 | `db()` | SAFE |
| src/app/dashboard/goals/page.tsx | 21 | `db()` | SAFE |
| src/app/dashboard/goals/page.tsx | 32 | `db()` | SAFE |
| src/app/dashboard/grant-compliance/actions.ts | 26 | `db()` | SAFE |
| src/app/dashboard/grant-compliance/actions.ts | 38 | `db()` | SAFE |
| src/app/dashboard/grant-compliance/actions.ts | 68 | `db()` | SAFE |
| src/app/dashboard/grant-compliance/actions.ts | 82 | `db()` | SAFE |
| src/app/dashboard/grant-compliance/actions.ts | 108 | `db()` | SAFE |
| src/app/dashboard/grant-compliance/actions.ts | 122 | `db()` | SAFE |
| src/app/dashboard/grant-compliance/actions.ts | 147 | `db()` | SAFE |
| src/app/dashboard/grant-compliance/actions.ts | 163 | `db()` | SAFE |
| src/app/dashboard/grant-compliance/page.tsx | 33 | `db()` | SAFE |
| src/app/dashboard/grants/actions.ts | 85 | `db()` | SAFE |
| src/app/dashboard/grants/actions.ts | 100 | `db()` | SAFE |
| src/app/dashboard/grants/actions.ts | 128 | `db()` | SAFE |
| src/app/dashboard/grants/actions.ts | 212 | `db()` | SAFE |
| src/app/dashboard/grants/actions.ts | 230 | `db()` | SAFE |
| src/app/dashboard/grants/actions.ts | 245 | `db()` | SAFE |
| src/app/dashboard/grants/actions.ts | 274 | `db()` | SAFE |
| src/app/dashboard/grants/actions.ts | 329 | `db()` | SAFE |
| src/app/dashboard/grants/actions.ts | 344 | `db()` | SAFE |
| src/app/dashboard/grants/actions.ts | 375 | `db()` | SAFE |
| src/app/dashboard/grants/actions.ts | 389 | `db()` | SAFE |
| src/app/dashboard/grants/compliance/page.tsx | 28 | `db()` | SAFE |
| src/app/dashboard/grants/page.tsx | 20 | `db()` | SAFE |
| src/app/dashboard/grants/page.tsx | 39 | `db()` | SAFE |
| src/app/dashboard/grants/page.tsx | 44 | `db()` | SAFE |
| src/app/dashboard/grants/pipeline/page.tsx | 21 | `db()` | SAFE |
| src/app/dashboard/grants/pipeline/page.tsx | 31 | `db()` | SAFE |
| src/app/dashboard/grants/pipeline/page.tsx | 42 | `db()` | SAFE |
| src/app/dashboard/insights/actions.ts | 17 | `db()` | SAFE |
| src/app/dashboard/insights/actions.ts | 36 | `db()` | SAFE |
| src/app/dashboard/issues/actions.ts | 29 | `db()` | SAFE |
| src/app/dashboard/issues/actions.ts | 49 | `db()` | SAFE |
| src/app/dashboard/issues/actions.ts | 105 | `db()` | SAFE |
| src/app/dashboard/issues/actions.ts | 124 | `db()` | SAFE |
| src/app/dashboard/issues/actions.ts | 139 | `db()` | SAFE |
| src/app/dashboard/issues/actions.ts | 188 | `db()` | SAFE |
| src/app/dashboard/issues/actions.ts | 203 | `db()` | SAFE |
| src/app/dashboard/issues/assign-actions.ts | 40 | `db()` | SAFE |
| src/app/dashboard/issues/assign-actions.ts | 82 | `db()` | SAFE |
| src/app/dashboard/issues/assign-actions.ts | 102 | `db()` | SAFE |
| src/app/dashboard/issues/assign-actions.ts | 115 | `db()` | SAFE |
| src/app/dashboard/issues/board/page.tsx | 17 | `db()` | SAFE |
| src/app/dashboard/issues/map/page.tsx | 16 | `db()` | SAFE |
| src/app/dashboard/issues/page.tsx | 23 | `db()` | SAFE |
| src/app/dashboard/issues/page.tsx | 39 | `db()` | SAFE |
| src/app/dashboard/kpi/[kpiId]/page.tsx | 23 | `db()` | SAFE |
| src/app/dashboard/kpi/[kpiId]/page.tsx | 40 | `db()` | SAFE |
| src/app/dashboard/kpi/actions.ts | 32 | `db()` | SAFE |
| src/app/dashboard/kpi/actions.ts | 47 | `db()` | SAFE |
| src/app/dashboard/kpi/actions.ts | 62 | `db()` | SAFE |
| src/app/dashboard/kpi/actions.ts | 79 | `db()` | SAFE |
| src/app/dashboard/kpi/actions.ts | 94 | `db()` | SAFE |
| src/app/dashboard/kpi/actions.ts | 163 | `db()` | SAFE |
| src/app/dashboard/kpi/actions.ts | 181 | `db()` | SAFE |
| src/app/dashboard/kpi/actions.ts | 196 | `db()` | SAFE |
| src/app/dashboard/kpi/actions.ts | 211 | `db()` | SAFE |
| src/app/dashboard/kpi/actions.ts | 228 | `db()` | SAFE |
| src/app/dashboard/kpi/actions.ts | 243 | `db()` | SAFE |
| src/app/dashboard/kpi/actions.ts | 298 | `db()` | SAFE |
| src/app/dashboard/kpi/actions.ts | 313 | `db()` | SAFE |
| src/app/dashboard/kpi/actions.ts | 342 | `db()` | SAFE |
| src/app/dashboard/kpi/actions.ts | 356 | `db()` | SAFE |
| src/app/dashboard/kpi/page.tsx | 24 | `db()` | SAFE |
| src/app/dashboard/kpi/page.tsx | 64 | `db()` | SAFE |
| src/app/dashboard/kpi/page.tsx | 69 | `db()` | SAFE |
| src/app/dashboard/kpi/page.tsx | 73 | `db()` | SAFE |
| src/app/dashboard/organization/roles/page.tsx | 49 | `tenantDb()` | SAFE |
| src/app/dashboard/programs/actions.ts | 29 | `db()` | SAFE |
| src/app/dashboard/programs/actions.ts | 41 | `db()` | SAFE |
| src/app/dashboard/programs/actions.ts | 54 | `db()` | SAFE |
| src/app/dashboard/programs/actions.ts | 68 | `db()` | SAFE |
| src/app/dashboard/programs/actions.ts | 106 | `db()` | SAFE |
| src/app/dashboard/programs/actions.ts | 118 | `db()` | SAFE |
| src/app/dashboard/programs/actions.ts | 130 | `db()` | SAFE |
| src/app/dashboard/programs/actions.ts | 130 | `db().$transaction()` | SAFE |
| src/app/dashboard/programs/actions.ts | 194 | `db()` | SAFE |
| src/app/dashboard/programs/actions.ts | 206 | `db()` | SAFE |
| src/app/dashboard/programs/actions.ts | 206 | `db().$transaction()` | SAFE |
| src/app/dashboard/programs/page.tsx | 25 | `db()` | SAFE |
| src/app/dashboard/programs/page.tsx | 29 | `db()` | SAFE |
| src/app/dashboard/programs/page.tsx | 48 | `db()` | SAFE |
| src/app/dashboard/reports/actions.ts | 15 | `db()` | SAFE |
| src/app/dashboard/reports/council/page.tsx | 21 | `db()` | SAFE |
| src/app/dashboard/reports/council/page.tsx | 25 | `db()` | SAFE |
| src/app/dashboard/reports/council/page.tsx | 29 | `db()` | SAFE |
| src/app/dashboard/reports/council/page.tsx | 33 | `db()` | SAFE |
| src/app/dashboard/reports/council/page.tsx | 41 | `db()` | SAFE |
| src/app/dashboard/reports/scheduled/page.tsx | 54 | `tenantDb()` | SAFE |
| src/app/dashboard/reports/scheduled/page.tsx | 95 | `tenantDb()` | SAFE |
| src/app/dashboard/reports/scheduled/page.tsx | 141 | `tenantDb()` | SAFE |
| src/app/dashboard/reports/scheduled/page.tsx | 167 | `tenantDb()` | SAFE |
| src/app/dashboard/work-orders/[id]/page.tsx | 107 | `tenantDb()` | SAFE |
| src/app/dashboard/work-orders/actions.ts | 22 | `db()` | SAFE |
| src/app/dashboard/work-orders/actions.ts | 34 | `db()` | SAFE |
| src/app/dashboard/work-orders/actions.ts | 66 | `db()` | SAFE |
| src/app/dashboard/work-orders/actions.ts | 78 | `db()` | SAFE |
| src/app/dashboard/work-orders/page.tsx | 70 | `tenantDb()` | SAFE |
| src/app/public/[slug]/grants.json/route.ts | 28 | `tenantDb()` | SAFE |
| src/app/public/[slug]/issues.json/route.ts | 28 | `tenantDb()` | SAFE |
| src/app/public/[slug]/kpis.json/route.ts | 28 | `tenantDb()` | SAFE |
| src/app/public/[slug]/page.tsx | 87 | `tenantDb()` | SAFE |
| src/lib/alerts/checkGrantComplianceAlerts.ts | 26 | `db()` | SAFE |
| src/lib/alerts/checkGrantComplianceAlerts.ts | 39 | `db()` | SAFE |
| src/lib/alerts/checkKpiAlerts.ts | 24 | `db()` | SAFE |
| src/lib/alerts/checkKpiAlerts.ts | 41 | `db()` | SAFE |
| src/lib/alerts/checkKpiAlerts.ts | 77 | `db()` | SAFE |
| src/lib/alerts/checkKpiAlerts.ts | 93 | `db()` | SAFE |
| src/lib/api-token-service.ts | 42 | `db()` | SAFE |
| src/lib/asset-health.ts | 32 | `db()` | SAFE |
| src/lib/asset-health.ts | 62 | `db()` | SAFE |
| src/lib/audit/getAuditLogs.ts | 13 | `db()` | SAFE |
| src/lib/audit/getAuditLogs.ts | 28 | `db()` | SAFE |
| src/lib/city-health.ts | 21 | `db()` | SAFE |
| src/lib/city-health.ts | 25 | `db()` | SAFE |
| src/lib/city-health.ts | 29 | `db()` | SAFE |
| src/lib/city-health.ts | 37 | `db()` | SAFE |
| src/lib/city-health.ts | 41 | `db()` | SAFE |
| src/lib/civic-insights.ts | 12 | `db()` | SAFE |
| src/lib/civic-insights.ts | 16 | `db()` | SAFE |
| src/lib/civic-insights.ts | 25 | `db()` | SAFE |
| src/lib/civic-insights.ts | 29 | `db()` | SAFE |
| src/lib/civic-insights.ts | 33 | `db()` | SAFE |
| src/lib/db.ts | 46 | `db()` | SAFE |
| src/lib/db.ts | 194 | `db()` | SAFE |
| src/lib/db.ts | 194 | `db().$transaction()` | SAFE |
| src/lib/db.ts | 214 | `db()` | SAFE |
| src/lib/db.ts | 214 | `db().$transaction()` | SAFE |
| src/lib/db.ts | 290 | `db()` | SAFE |
| src/lib/department-access.ts | 6 | `db()` | SAFE |
| src/lib/department-access.ts | 28 | `db()` | SAFE |
| src/lib/department-access.ts | 40 | `db()` | SAFE |
| src/lib/department-access.ts | 48 | `db()` | SAFE |
| src/lib/events.ts | 20 | `db()` | SAFE |
| src/lib/grants/pipeline.ts | 5 | `db()` | SAFE |
| src/lib/grants/pipeline.ts | 8 | `db()` | SAFE |
| src/lib/grants/pipeline.ts | 11 | `db()` | SAFE |
| src/lib/insights/create-insight.ts | 53 | `db()` | SAFE |
| src/lib/issue-hotspots.ts | 27 | `db()` | SAFE |
| src/lib/issue-hotspots.ts | 39 | `db()` | SAFE |
| src/lib/kpi-trends.ts | 41 | `db()` | SAFE |
| src/lib/kpi-trends.ts | 67 | `db()` | SAFE |
| src/lib/kpi-trends.ts | 82 | `db()` | SAFE |
| src/lib/notifications.ts | 10 | `db()` | SAFE |
| src/lib/notifications.ts | 23 | `db()` | SAFE |
| src/lib/notifications.ts | 67 | `db()` | SAFE |
| src/lib/reports/generate-council-report.ts | 12 | `db()` | SAFE |
| src/lib/reports/generate-council-report.ts | 16 | `db()` | SAFE |
| src/lib/reports/generate-council-report.ts | 20 | `db()` | SAFE |
| src/lib/spatial.ts | 75 | `db()` | SAFE |
| src/lib/spatial.ts | 103 | `db()` | SAFE |
| src/lib/spatial.ts | 122 | `db()` | SAFE |
| src/lib/system-metrics.ts | 20 | `tenantDb()` | SAFE |
| src/lib/tenantDb.ts | 9 | `client.$transaction()` | SAFE |
| src/scripts/seed-roles.ts | 12 | `tenantDb()` | SAFE |
| src/services/organization-provisioning.ts | 73 | `tenantDb()` | SAFE |
| src/services/organization-provisioning.ts | 97 | `tenantDb()` | SAFE |
| src/workers/civic-intelligence-worker.ts | 68 | `tenantDb()` | SAFE |
| src/workers/intelligence/grant-risk-worker.ts | 11 | `tenantDb()` | SAFE |
| src/workers/intelligence/kpi-trend-worker.ts | 30 | `tenantDb()` | SAFE |
| src/workers/intelligence/spatial-cluster-worker.ts | 39 | `tenantDb()` | SAFE |
| src/workers/report-scheduler.ts | 78 | `tenantDb()` | SAFE |
| src/workers/work-order-generator.ts | 68 | `tenantDb()` | SAFE |
| tests/unit/db-tenant-enforcement.test.ts | 72 | `db()` | SAFE |
| tests/unit/db-tenant-enforcement.test.ts | 76 | `db()` | SAFE |
| tests/unit/db-tenant-enforcement.test.ts | 79 | `db()` | SAFE |
| tests/unit/db-tenant-enforcement.test.ts | 86 | `db()` | SAFE |
| tests/unit/db-tenant-enforcement.test.ts | 89 | `db()` | SAFE |

## B) SYSTEM CONTEXT

Includes `dbSystem()` and system-scoped transactions. These are legitimate for bootstrap/auth/worker/admin workflows but require explicit tenant filtering where tenant data is accessed.

| File | Line | Function Used | Classification |
|---|---:|---|---|
| scripts/seed/seed-demo-city.ts | 109 | `dbSystem()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 109 | `dbSystem().$transaction()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 181 | `dbSystem()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 194 | `dbSystem()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 194 | `dbSystem().$transaction()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 213 | `dbSystem()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 213 | `dbSystem().$transaction()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 294 | `dbSystem()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 294 | `dbSystem().$transaction()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 377 | `dbSystem()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 377 | `dbSystem().$transaction()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 434 | `dbSystem()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 434 | `dbSystem().$transaction()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 481 | `dbSystem()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 481 | `dbSystem().$transaction()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 490 | `dbSystem()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 508 | `dbSystem()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 508 | `dbSystem().$transaction()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 540 | `dbSystem()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 540 | `dbSystem().$transaction()` | SYSTEM |
| scripts/seed/seed-demo-city.ts | 581 | `dbSystem()` | SYSTEM |
| scripts/seed/seed-woodburn-public-dashboard.ts | 54 | `dbSystem()` | SYSTEM |
| scripts/seed/seed-woodburn-public-dashboard.ts | 68 | `dbSystem()` | SYSTEM |
| scripts/seed/seed-woodburn-public-dashboard.ts | 68 | `dbSystem().$transaction()` | SYSTEM |
| scripts/seed/seed-woodburn-public-dashboard.ts | 158 | `dbSystem()` | SYSTEM |
| scripts/seed/seed-woodburn-public-dashboard.ts | 158 | `dbSystem().$transaction()` | SYSTEM |
| scripts/seed/seed-woodburn-public-dashboard.ts | 187 | `dbSystem()` | SYSTEM |
| src/app/api/auth/register/route.ts | 37 | `dbSystem()` | SYSTEM |
| src/app/api/auth/register/route.ts | 50 | `dbSystem()` | SYSTEM |
| src/app/api/auth/register/route.ts | 50 | `dbSystem().$transaction()` | SYSTEM |
| src/app/api/citizen/register/route.ts | 33 | `dbSystem()` | SYSTEM |
| src/app/api/citizen/register/route.ts | 42 | `dbSystem()` | SYSTEM |
| src/app/api/citizen/register/route.ts | 56 | `dbSystem()` | SYSTEM |
| src/app/api/public/issues-by-cluster/route.ts | 50 | `dbSystem()` | SYSTEM |
| src/app/api/public/issues-by-cluster/route.ts | 60 | `dbSystem()` | SYSTEM |
| src/app/api/public/report-issue/route.ts | 31 | `dbSystem()` | SYSTEM |
| src/app/api/public/report-issue/route.ts | 40 | `dbSystem()` | SYSTEM |
| src/app/api/reports/council/route.ts | 14 | `dbSystem()` | SYSTEM |
| src/app/api/reports/council/route.ts | 37 | `dbSystem()` | SYSTEM |
| src/app/api/reports/council/route.ts | 40 | `dbSystem()` | SYSTEM |
| src/app/api/reports/council/route.ts | 43 | `dbSystem()` | SYSTEM |
| src/app/api/reports/council/route.ts | 46 | `dbSystem()` | SYSTEM |
| src/app/api/reports/council/route.ts | 49 | `dbSystem()` | SYSTEM |
| src/app/citizen/dashboard/actions.ts | 11 | `dbSystem()` | SYSTEM |
| src/app/citizen/dashboard/page.tsx | 13 | `dbSystem()` | SYSTEM |
| src/app/citizen/dashboard/page.tsx | 28 | `dbSystem()` | SYSTEM |
| src/app/citizen/issues/[id]/actions.ts | 24 | `dbSystem()` | SYSTEM |
| src/app/citizen/issues/[id]/actions.ts | 40 | `dbSystem()` | SYSTEM |
| src/app/citizen/issues/[id]/actions.ts | 69 | `dbSystem()` | SYSTEM |
| src/app/citizen/issues/[id]/page.tsx | 17 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/budget/page.tsx | 14 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/budget/page.tsx | 21 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/dashboard/page.tsx | 23 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/dashboard/page.tsx | 30 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/dashboard/page.tsx | 34 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/dashboard/page.tsx | 43 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/dashboard/page.tsx | 50 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/dashboard/page.tsx | 57 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/departments/[departmentId]/page.tsx | 17 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/departments/[departmentId]/page.tsx | 38 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/departments/page.tsx | 15 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/departments/page.tsx | 21 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/goals/page.tsx | 14 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/issues/page.tsx | 16 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/issues/page.tsx | 22 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/kpi/page.tsx | 18 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/kpis/page.tsx | 22 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/kpis/page.tsx | 30 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/map/page.tsx | 17 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/map/page.tsx | 24 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/map/page.tsx | 44 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/map/page.tsx | 48 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/page.tsx | 18 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/programs/[programId]/page.tsx | 31 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/programs/[programId]/page.tsx | 59 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/programs/page.tsx | 23 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/report-issue/actions.ts | 54 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/report-issue/actions.ts | 87 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/report-issue/actions.ts | 104 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/report-issue/actions.ts | 139 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/report-issue/actions.ts | 165 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/report-issue/actions.ts | 165 | `dbSystem().$transaction()` | SYSTEM |
| src/app/public/[slug]/report-issue/actions.ts | 208 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/report-issue/page.tsx | 17 | `dbSystem()` | SYSTEM |
| src/app/public/[slug]/report-issue/page.tsx | 22 | `dbSystem()` | SYSTEM |
| src/lib/api-token-service.ts | 76 | `dbSystem()` | SYSTEM |
| src/lib/api-token-service.ts | 102 | `dbSystem()` | SYSTEM |
| src/lib/audit.ts | 14 | `dbSystem()` | SYSTEM |
| src/lib/auth.ts | 88 | `dbSystem()` | SYSTEM |
| src/lib/auth.ts | 150 | `dbSystem()` | SYSTEM |
| src/lib/db.ts | 120 | `prisma.$transaction()` | SYSTEM |
| src/lib/db.ts | 202 | `prisma.$transaction()` | SYSTEM |
| src/lib/db.ts | 294 | `dbSystem()` | SYSTEM |
| src/lib/public/getOrganizationBySlug.ts | 5 | `dbSystem()` | SYSTEM |
| src/lib/public/transparency-metrics.ts | 12 | `dbSystem()` | SYSTEM |
| src/lib/public/transparency-metrics.ts | 16 | `dbSystem()` | SYSTEM |
| src/lib/public/transparency-metrics.ts | 20 | `dbSystem()` | SYSTEM |
| src/lib/sla-engine.ts | 10 | `dbSystem()` | SYSTEM |
| src/lib/system-metrics.ts | 41 | `dbSystem()` | SYSTEM |
| src/lib/tenant-db.ts | 4 | `dbSystem()` | SYSTEM |
| src/lib/tenantDb.ts | 7 | `dbSystem()` | SYSTEM |
| src/scripts/seed-roles.ts | 6 | `dbSystem()` | SYSTEM |
| src/scripts/seed-roles.ts | 31 | `dbSystem()` | SYSTEM |
| src/workers/civic-intelligence-worker.ts | 349 | `dbSystem()` | SYSTEM |
| src/workers/event-worker.ts | 20 | `dbSystem()` | SYSTEM |
| src/workers/event-worker.ts | 43 | `dbSystem()` | SYSTEM |
| src/workers/event-worker.ts | 60 | `dbSystem()` | SYSTEM |
| src/workers/event-worker.ts | 84 | `dbSystem()` | SYSTEM |
| src/workers/grant-deadline-worker.ts | 11 | `dbSystem()` | SYSTEM |
| src/workers/grant-deadline-worker.ts | 48 | `dbSystem()` | SYSTEM |
| src/workers/grant-deadline-worker.ts | 61 | `dbSystem()` | SYSTEM |
| src/workers/grant-deadline-worker.ts | 76 | `dbSystem()` | SYSTEM |
| src/workers/grant-pipeline-refresh-worker.ts | 6 | `dbSystem()` | SYSTEM |
| src/workers/grant-reminder-worker.ts | 10 | `dbSystem()` | SYSTEM |
| src/workers/grant-reminder-worker.ts | 30 | `dbSystem()` | SYSTEM |
| src/workers/grant-reminder-worker.ts | 63 | `dbSystem()` | SYSTEM |
| src/workers/grant-reminder-worker.ts | 79 | `dbSystem()` | SYSTEM |
| src/workers/intelligence/grant-risk-worker.ts | 120 | `dbSystem()` | SYSTEM |
| src/workers/intelligence/issue-anomaly-worker.ts | 55 | `dbSystem()` | SYSTEM |
| src/workers/intelligence/issue-anomaly-worker.ts | 67 | `dbSystem()` | SYSTEM |
| src/workers/intelligence/issue-anomaly-worker.ts | 79 | `dbSystem()` | SYSTEM |
| src/workers/intelligence/issue-anomaly-worker.ts | 158 | `dbSystem()` | SYSTEM |
| src/workers/intelligence/kpi-trend-worker.ts | 129 | `dbSystem()` | SYSTEM |
| src/workers/intelligence/spatial-cluster-worker.ts | 132 | `dbSystem()` | SYSTEM |
| src/workers/issue-sla-worker.ts | 8 | `dbSystem()` | SYSTEM |
| src/workers/issue-sla-worker.ts | 40 | `dbSystem()` | SYSTEM |
| src/workers/issue-sla-worker.ts | 73 | `dbSystem()` | SYSTEM |
| src/workers/issue-sla-worker.ts | 80 | `dbSystem()` | SYSTEM |
| src/workers/issue-sla-worker.ts | 100 | `dbSystem()` | SYSTEM |
| src/workers/maintenance-scheduler-worker.ts | 8 | `dbSystem()` | SYSTEM |
| src/workers/maintenance-scheduler-worker.ts | 32 | `dbSystem()` | SYSTEM |
| src/workers/maintenance-scheduler-worker.ts | 74 | `dbSystem()` | SYSTEM |
| src/workers/maintenance-scheduler-worker.ts | 94 | `dbSystem()` | SYSTEM |
| src/workers/report-scheduler.ts | 71 | `dbSystem()` | SYSTEM |
| src/workers/work-order-generator.ts | 36 | `dbSystem()` | SYSTEM |
| tests/unit/db-tenant-enforcement.test.ts | 96 | `dbSystem()` | SYSTEM |
| tests/unit/db-tenant-enforcement.test.ts | 97 | `dbSystem()` | SYSTEM |

## C) UNSAFE / UNKNOWN

Includes direct Prisma usage and transaction/helper patterns that bypass or may bypass the tenant guardrail abstraction.

| File | Line | Function Used | Classification |
|---|---:|---|---|
| prisma/seed.ts | 13 | `new PrismaClient()` | UNSAFE |
| prisma/seed.ts | 116 | `prisma.<member>` | UNSAFE |
| prisma/seed.ts | 126 | `prisma.$transaction()` | UNSAFE |
| prisma/seed.ts | 126 | `prisma.<member>` | UNSAFE |
| prisma/seed.ts | 227 | `prisma.<member>` | UNSAFE |
| src/lib/db.ts | 16 | `prisma.<member>` | UNSAFE |
| src/lib/db.ts | 116 | `prisma.<member>` | UNSAFE |
| src/lib/db.ts | 120 | `prisma.<member>` | UNSAFE |
| src/lib/db.ts | 191 | `prisma.<member>` | UNSAFE |
| src/lib/db.ts | 202 | `prisma.<member>` | UNSAFE |
| src/lib/prisma.ts | 11 | `new PrismaClient()` | UNSAFE |

## Potential Tenant-Bypass Locations

- `prisma/seed.ts:13` — Direct Prisma usage bypasses tenantDb/db() guardrails unless strictly limited to wrapper/seed contexts.
- `prisma/seed.ts:116` — Direct Prisma usage bypasses tenantDb/db() guardrails unless strictly limited to wrapper/seed contexts.
- `prisma/seed.ts:126` — Direct Prisma usage bypasses tenantDb/db() guardrails unless strictly limited to wrapper/seed contexts.
- `prisma/seed.ts:227` — Direct Prisma usage bypasses tenantDb/db() guardrails unless strictly limited to wrapper/seed contexts.
- `src/app/api/public/issues-by-cluster/route.ts:50` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/api/public/issues-by-cluster/route.ts:60` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/api/public/report-issue/route.ts:31` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/api/public/report-issue/route.ts:40` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/budget/page.tsx:14` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/budget/page.tsx:21` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/dashboard/page.tsx:23` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/dashboard/page.tsx:30` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/dashboard/page.tsx:34` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/dashboard/page.tsx:43` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/dashboard/page.tsx:50` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/dashboard/page.tsx:57` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/departments/[departmentId]/page.tsx:17` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/departments/[departmentId]/page.tsx:38` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/departments/page.tsx:15` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/departments/page.tsx:21` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/goals/page.tsx:14` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/issues/page.tsx:16` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/issues/page.tsx:22` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/kpi/page.tsx:18` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/kpis/page.tsx:22` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/kpis/page.tsx:30` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/map/page.tsx:17` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/map/page.tsx:24` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/map/page.tsx:44` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/map/page.tsx:48` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/page.tsx:18` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/programs/[programId]/page.tsx:31` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/programs/[programId]/page.tsx:59` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/programs/page.tsx:23` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/report-issue/actions.ts:54` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/report-issue/actions.ts:87` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/report-issue/actions.ts:104` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/report-issue/actions.ts:139` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/report-issue/actions.ts:165` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/report-issue/actions.ts:208` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/report-issue/page.tsx:17` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/app/public/[slug]/report-issue/page.tsx:22` — Public route uses dbSystem(); relies on manual organization filtering and publication policy.
- `src/lib/db.ts:16` — Direct Prisma usage bypasses tenantDb/db() guardrails unless strictly limited to wrapper/seed contexts.
- `src/lib/db.ts:116` — Direct Prisma usage bypasses tenantDb/db() guardrails unless strictly limited to wrapper/seed contexts.
- `src/lib/db.ts:120` — Direct Prisma usage bypasses tenantDb/db() guardrails unless strictly limited to wrapper/seed contexts.
- `src/lib/db.ts:191` — Direct Prisma usage bypasses tenantDb/db() guardrails unless strictly limited to wrapper/seed contexts.
- `src/lib/db.ts:202` — Direct Prisma usage bypasses tenantDb/db() guardrails unless strictly limited to wrapper/seed contexts.
- `src/lib/prisma.ts:11` — Direct Prisma usage bypasses tenantDb/db() guardrails unless strictly limited to wrapper/seed contexts.
- `src/workers/event-worker.ts:20` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/event-worker.ts:43` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/event-worker.ts:60` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/event-worker.ts:84` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/grant-deadline-worker.ts:11` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/grant-deadline-worker.ts:48` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/grant-deadline-worker.ts:61` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/grant-deadline-worker.ts:76` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/grant-pipeline-refresh-worker.ts:6` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/grant-reminder-worker.ts:10` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/grant-reminder-worker.ts:30` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/grant-reminder-worker.ts:63` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/grant-reminder-worker.ts:79` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/intelligence/issue-anomaly-worker.ts:55` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/intelligence/issue-anomaly-worker.ts:67` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/intelligence/issue-anomaly-worker.ts:79` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/intelligence/issue-anomaly-worker.ts:158` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/issue-sla-worker.ts:8` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/issue-sla-worker.ts:40` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/issue-sla-worker.ts:73` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/issue-sla-worker.ts:80` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/issue-sla-worker.ts:100` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/maintenance-scheduler-worker.ts:8` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/maintenance-scheduler-worker.ts:32` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/maintenance-scheduler-worker.ts:74` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/maintenance-scheduler-worker.ts:94` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.
- `src/workers/work-order-generator.ts:36` — Worker dbSystem() call may bypass tenant session context; depends on explicit organizationId predicates.

## Method

- Static grep-based audit only (no code changes).
- Classification is pattern-based and conservative.
- `db()` calls are classified as SAFE because `src/lib/db.ts` enforces tenant context at runtime.