# Prioritized Remediation Plan (Top 10)

Scope: This plan implements only the Top 10 fixes from `audit/CIVICMETRIX_TECHNICAL_AUDIT.md`.
Constraint: no architecture refactor unless required for tenant isolation.

## Global Rollout Phases (Safe Order)
1. **Phase 0 (pre-prod only):** add guardrail tests + CI gate updates (Fixes 4, 5).
2. **Phase 1 (critical isolation):** tenant context/public-citizen isolation + middleware/auth propagation (Fixes 1, 2).
3. **Phase 2 (database boundary):** expand RLS + validate tenant FK constraints + policy coverage tests (Fix 3).
4. **Phase 3 (runtime resilience):** DLQ monitor/alerts + API validation/response envelopes + pagination/streaming (Fixes 6, 7, 8).
5. **Phase 4 (hardening/compliance):** container/runtime hardening + immutable audit/token governance/incident runbooks (Fixes 9, 10).

---

## 1) Fix tenant context on `/public/*` and `/citizen/*`

### Exact files to modify
- `src/app/public/[slug]/report-issue/actions.ts`
- `src/app/public/[slug]/report-issue/page.tsx`
- `src/app/public/[slug]/dashboard/page.tsx`
- `src/app/public/[slug]/budget/page.tsx`
- `src/app/public/[slug]/departments/page.tsx`
- `src/app/public/[slug]/departments/[departmentId]/page.tsx`
- `src/app/public/[slug]/goals/page.tsx`
- `src/app/public/[slug]/infrastructure/page.tsx`
- `src/app/public/[slug]/kpi/page.tsx`
- `src/app/public/[slug]/programs/page.tsx`
- `src/app/public/[slug]/programs/[programId]/page.tsx`
- `src/app/public/[slug]/transparency/page.tsx`
- `src/lib/public/transparency-metrics.ts`
- `src/app/citizen/dashboard/page.tsx`
- `src/app/citizen/dashboard/actions.ts`
- `src/app/citizen/issues/[id]/page.tsx`
- `src/app/citizen/issues/[id]/actions.ts`

### Example code patch
```diff
--- a/src/app/public/[slug]/report-issue/actions.ts
+++ b/src/app/public/[slug]/report-issue/actions.ts
@@
-import { db } from "@/lib/db";
+import { dbSystem } from "@/lib/db";
@@
-  const organization = await db().organization.findUnique({ where: { slug } });
+  const organization = await dbSystem().organization.findUnique({ where: { slug } });
@@
-  const department = await db().department.findFirst({ where: { id: departmentId } });
+  const department = await dbSystem().department.findFirst({
+    where: { id: departmentId, organizationId: organization.id },
+  });
@@
-  const issue = await db().$transaction(async (tx) => {
+  const issue = await dbSystem().$transaction(async (tx) => {
```

### Migration SQL
- None.

### Estimated complexity
- **High** (many route/page touchpoints, high regression risk).

### Safe rollout order
1. Convert public slug routes first (`/public/[slug]/*`) to `dbSystem()` + explicit `organizationId` filters.
2. Convert citizen pages/actions next.
3. Ship behind a short-lived feature flag if needed; verify with public/citizen smoke tests.

---

## 2) Expand middleware/auth tenant propagation model

### Exact files to modify
- `middleware.ts`
- `src/lib/auth.ts`
- `src/lib/tenant-context/index.ts`
- `src/app/citizen/layout.tsx`
- `tests/integration/public-citizen-tenant-context.test.ts` (new)

### Example code patch
```diff
--- a/middleware.ts
+++ b/middleware.ts
@@
 export const config = {
-  matcher: ["/dashboard/:path*", "/api/:path*"],
+  matcher: ["/dashboard/:path*", "/api/:path*", "/citizen/:path*"],
 };
```

```diff
--- a/src/lib/auth.ts
+++ b/src/lib/auth.ts
@@
-  if (organizationId && session?.user?.id && session.user.userType !== "citizen") {
+  if (organizationId && session?.user?.id) {
     setTenantContext({
       organizationId,
-      principalType: "staff",
+      principalType: session.user.userType === "citizen" ? "citizen" : "staff",
       principalId: session.user.id,
       role: session.user.role,
     });
   }
```

### Migration SQL
- None.

### Estimated complexity
- **Medium**.

### Safe rollout order
1. Merge auth context change first (server-side session path).
2. Then expand middleware matcher.
3. Run integration tests for `/citizen/dashboard` and public issue report flow before deploy.

---

## 3) Complete RLS coverage + automated policy coverage tests

### Exact files to modify
- `prisma/migrations/<timestamp>_complete_tenant_rls_coverage/migration.sql` (new)
- `prisma/migrations/<timestamp>_validate_not_valid_tenant_fks/migration.sql` (new)
- `tests/integration/tenant-rls-coverage.test.ts` (new)
- `tests/integration/tenant-fk-validation.test.ts` (new)
- `scripts/check-migrations.ts` (extend to assert expected RLS targets)

### Example migration SQL
```sql
-- Complete RLS coverage for remaining tenant tables.
ALTER TABLE "ApiToken" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS api_token_tenant_policy ON "ApiToken";
CREATE POLICY api_token_tenant_policy ON "ApiToken"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "ApiToken" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Citizen" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS citizen_tenant_policy ON "Citizen";
CREATE POLICY citizen_tenant_policy ON "Citizen"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "Citizen" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS event_tenant_policy ON "Event";
CREATE POLICY event_tenant_policy ON "Event"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "Event" FORCE ROW LEVEL SECURITY;

-- Validate tenant FK constraints added as NOT VALID.
ALTER TABLE "Grant" VALIDATE CONSTRAINT "Grant_org_department_tenant_fkey";
ALTER TABLE "KPI" VALIDATE CONSTRAINT "KPI_org_program_tenant_fkey";
ALTER TABLE "IssueReport" VALIDATE CONSTRAINT "IssueReport_org_asset_tenant_fkey";
ALTER TABLE "WorkOrder" VALIDATE CONSTRAINT "WorkOrder_org_issue_tenant_fkey";
```

### Example test patch
```diff
--- /dev/null
+++ b/tests/integration/tenant-rls-coverage.test.ts
+import { describe, expect, it } from "vitest";
+
+describe("tenant RLS coverage", () => {
+  it("ensures required tenant tables have RLS enabled", async () => {
+    // Query pg_class/pg_policies and assert required table set.
+    expect(true).toBe(true);
+  });
+});
```

### Estimated complexity
- **High**.

### Safe rollout order
1. Apply RLS policies in staging.
2. Validate constraints in off-peak window.
3. Enable blocking tests in CI before production rollout.

---

## 4) Fix Prisma drift check for Prisma 7 + shadow DB in CI

### Exact files to modify
- `.github/workflows/ci.yml`
- `.env.example`

### Example code patch
```diff
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@
     env:
       DATABASE_URL: postgresql://postgres:postgres@localhost:5432/civicmetrics_test?schema=public
+      SHADOW_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/civicmetrics_shadow?schema=public
@@
-      - name: Schema drift detection
-        run: npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --exit-code
+      - name: Schema drift detection
+        run: npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --shadow-database-url "$SHADOW_DATABASE_URL" --exit-code
```

### Migration SQL
- None.

### Estimated complexity
- **Low**.

### Safe rollout order
1. Update CI command and env.
2. Run on PRs without branch protection changes.
3. Enforce as required check after 2-3 green runs.

---

## 5) Resolve failing unit tests and enforce green test gate

### Exact files to modify
- `tests/unit/worker-dlq.test.ts`
- `tests/unit/db-tenant-enforcement.test.ts`
- `src/workers/index.ts`
- `src/lib/db.ts`
- `.github/workflows/ci.yml`

### Example code patches
```diff
--- a/src/workers/index.ts
+++ b/src/workers/index.ts
@@
 const JOB_ATTEMPTS = 3;
+const JOB_TIMEOUT_MS = 120_000;
@@
       attempts: JOB_ATTEMPTS,
+      timeout: JOB_TIMEOUT_MS,
```

```diff
--- a/tests/unit/db-tenant-enforcement.test.ts
+++ b/tests/unit/db-tenant-enforcement.test.ts
@@
-    await expect(db().user.findMany({ where: {} })).rejects.toThrow("Tenant context not set")
+    await expect(db().user.findMany({ where: {} })).rejects.toThrow("Tenant context required for db() access")
```

### Migration SQL
- None.

### Estimated complexity
- **Low**.

### Safe rollout order
1. Fix test/code mismatch.
2. Confirm `npm run test` green in CI.
3. Keep failing tests as release blocker.

---

## 6) Add DLQ consumer/monitor worker + actionable alerting

### Exact files to modify
- `src/workers/index.ts`
- `src/workers/dlq-monitor-worker.ts` (new)
- `src/lib/queue.ts`
- `src/lib/notifications.ts`
- `src/lib/observability/logger.ts`
- `tests/unit/worker-dlq.test.ts`

### Example code patch
```diff
--- /dev/null
+++ b/src/workers/dlq-monitor-worker.ts
+import { deadLetterQueue } from "@/lib/queue";
+import { logger } from "@/lib/observability/logger";
+
+export async function runDlqMonitorWorker() {
+  const counts = await deadLetterQueue?.getJobCounts("waiting", "failed");
+  if (!counts) return;
+  if ((counts.waiting ?? 0) > 25 || (counts.failed ?? 0) > 0) {
+    logger.error("worker_dlq_threshold_exceeded", { counts });
+    // Hook: send pager/slack/email alert.
+  }
+}
```

### Migration SQL
- Optional, for persisted incidents:
```sql
CREATE TABLE IF NOT EXISTS "Incident" (
  "id" text PRIMARY KEY,
  "organizationId" text,
  "source" text NOT NULL,
  "severity" text NOT NULL,
  "payload" jsonb NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "resolvedAt" timestamptz
);
CREATE INDEX IF NOT EXISTS "Incident_source_createdAt_idx" ON "Incident"("source", "createdAt");
```

### Estimated complexity
- **Medium**.

### Safe rollout order
1. Deploy monitor worker in observe-only mode.
2. Add threshold-based alerts.
3. Tune thresholds after production baselines.

---

## 7) Standardize API input validation + output/error schema

### Exact files to modify
- `src/lib/validation/http.ts` (new)
- `src/lib/api/error-response.ts`
- `src/lib/api/success-response.ts`
- `src/app/api/city/operations/route.ts`
- `src/app/api/executive/weekly-report/route.ts`
- `src/app/api/citizen/register/route.ts`
- `src/app/api/documents/upload/route.ts`
- `src/app/api/documents/[id]/route.ts`
- `src/app/api/internal/metrics/route.ts`

### Example code patch
```diff
--- /dev/null
+++ b/src/lib/validation/http.ts
+import { z } from "zod";
+
+export const paginationQuerySchema = z.object({
+  page: z.coerce.number().int().min(1).default(1),
+  pageSize: z.coerce.number().int().min(1).max(200).default(50),
+});
```

```diff
--- a/src/app/api/city/operations/route.ts
+++ b/src/app/api/city/operations/route.ts
@@
-import { NextResponse } from "next/server";
+import { apiError } from "@/lib/api/error-response";
+import { apiSuccess } from "@/lib/api/success-response";
+import { paginationQuerySchema } from "@/lib/validation/http";
@@
-  return NextResponse.json(payload);
+  return apiSuccess(payload);
```

### Migration SQL
- None.

### Estimated complexity
- **Medium**.

### Safe rollout order
1. Add shared validators/helpers first.
2. Migrate high-traffic APIs (`city/operations`, `executive/weekly-report`) next.
3. Migrate remaining routes; keep response shape compatibility where public clients depend on it.

---

## 8) Add pagination/streaming for public JSON/CSV + heavy reports

### Exact files to modify
- `src/app/public/[slug]/kpis.json/route.ts`
- `src/app/public/[slug]/grants.json/route.ts`
- `src/app/public/[slug]/kpis.csv/route.ts`
- `src/app/public/[slug]/grants.csv/route.ts`
- `src/app/api/city/operations/route.ts`
- `src/app/api/executive/weekly-report/route.ts`
- `src/lib/validation/http.ts`

### Example code patch
```diff
--- a/src/app/public/[slug]/kpis.json/route.ts
+++ b/src/app/public/[slug]/kpis.json/route.ts
@@
+import { paginationQuerySchema } from "@/lib/validation/http";
@@
-  const kpis = await dbSystem().kPI.findMany({
+  const url = new URL(request.url);
+  const paging = paginationQuerySchema.parse({
+    page: url.searchParams.get("page"),
+    pageSize: url.searchParams.get("pageSize"),
+  });
+
+  const kpis = await dbSystem().kPI.findMany({
@@
+    skip: (paging.page - 1) * paging.pageSize,
+    take: paging.pageSize,
   })
@@
-  return Response.json({ organization: org.name, total: kpis.length, data: kpis })
+  return Response.json({
+    organization: org.name,
+    pagination: { page: paging.page, pageSize: paging.pageSize, returned: kpis.length },
+    data: kpis,
+  })
```

### Migration SQL
- None.

### Estimated complexity
- **Medium**.

### Safe rollout order
1. Add pagination params with backward-compatible defaults.
2. Add CSV chunked streaming for large exports.
3. Publish API contract update for integrators.

---

## 9) Harden container/runtime posture (worker image + Redis parity)

### Exact files to modify
- `Dockerfile.worker`
- `docker-compose.yml`
- `scripts/start-worker.ts`
- `README.md` (runtime prerequisites)

### Example code patch
```diff
--- a/Dockerfile.worker
+++ b/Dockerfile.worker
@@
-FROM node:20-alpine
-WORKDIR /app
-COPY . .
-RUN npm install
-RUN npm run build
-CMD ["npm", "run", "start:worker"]
+FROM node:20-alpine AS build
+WORKDIR /app
+COPY package*.json ./
+RUN npm ci
+COPY . .
+RUN npm run build
+
+FROM node:20-alpine AS runtime
+WORKDIR /app
+ENV NODE_ENV=production
+COPY --from=build /app/package*.json ./
+RUN npm ci --omit=dev
+COPY --from=build /app/.next ./.next
+COPY --from=build /app/node_modules ./node_modules
+COPY --from=build /app/public ./public
+COPY --from=build /app/prisma ./prisma
+USER node
+CMD ["npm", "run", "start:worker"]
```

```diff
--- a/docker-compose.yml
+++ b/docker-compose.yml
@@
 services:
   postgres:
@@
+  redis:
+    image: redis:7
+    container_name: civicmetrix-redis
+    restart: always
+    ports:
+      - "6379:6379"
```

### Migration SQL
- None.

### Estimated complexity
- **Medium**.

### Safe rollout order
1. Add Redis service parity locally.
2. Roll out worker image hardening in staging.
3. Promote to production after worker queue soak test.

---

## 10) Strengthen compliance controls (immutable audit, token governance, centralized monitoring/IR)

### Exact files to modify
- `src/lib/audit.ts`
- `src/lib/api-token-service.ts`
- `src/app/api/internal/metrics/route.ts`
- `src/lib/observability/logger.ts`
- `src/lib/observability/metrics.ts`
- `src/lib/security/authorization.ts`
- `src/app/api/admin/api-tokens/route.ts` (new)
- `src/app/api/admin/api-tokens/[id]/revoke/route.ts` (new)
- `audit/COMPLIANCE_AUDIT.md` (control mapping updates)
- `audit/INCIDENT_RESPONSE_RUNBOOK.md` (new)

### Example code patch
```diff
--- a/src/lib/api-token-service.ts
+++ b/src/lib/api-token-service.ts
@@
 type CreateApiTokenInput = {
   organizationId: string;
   name: string;
   scope: string;
-  expiresAt?: Date | null;
+  expiresAt: Date;
 };
@@
-  const created = await db().apiToken.create({
+  const created = await db().apiToken.create({
     data: {
@@
-      expiresAt: expiresAt ?? null,
+      expiresAt,
```

### Migration SQL
```sql
-- Immutable audit trail controls.
ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "hash" text,
  ADD COLUMN IF NOT EXISTS "prevHash" text;

CREATE OR REPLACE FUNCTION prevent_auditlog_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auditlog_no_update ON "AuditLog";
CREATE TRIGGER auditlog_no_update
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_auditlog_mutation();

-- Token governance baseline: no new non-expiring tokens.
ALTER TABLE "ApiToken"
  ADD CONSTRAINT "ApiToken_expiresAt_required" CHECK ("expiresAt" IS NOT NULL) NOT VALID;
ALTER TABLE "ApiToken"
  VALIDATE CONSTRAINT "ApiToken_expiresAt_required";
```

### Estimated complexity
- **High**.

### Safe rollout order
1. Add immutable audit trigger in staging and verify write paths.
2. Introduce ADMIN-only token lifecycle endpoints with mandatory expiry.
3. Ship incident runbook + alert routing; run tabletop incident exercise before production certification.

---

## Complexity Summary
- High: Fixes **1, 3, 10**
- Medium: Fixes **2, 6, 7, 8, 9**
- Low: Fixes **4, 5**

## Release Gate Checklist
- [ ] Tenant isolation tests green (`public/citizen`, RLS, FK validation).
- [ ] CI drift check green with Prisma 7 syntax + shadow DB.
- [ ] Unit tests green including `worker-dlq` and `db-tenant-enforcement`.
- [ ] DLQ alerts verified in staging.
- [ ] Public export pagination/streaming verified for large datasets.
- [ ] Compliance controls (immutable audit + token governance + IR runbook) approved.
