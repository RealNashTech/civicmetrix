-- Step 8 operational indexes.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "issue_report_org_status_priority_created_idx"
  ON "IssueReport" ("organizationId", "status", "priority", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "work_order_org_status_priority_created_idx"
  ON "WorkOrder" ("organizationId", "status", "priority", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "work_order_issue_idx"
  ON "WorkOrder" ("issueId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "work_order_department_idx"
  ON "WorkOrder" ("departmentId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "api_token_active_prefix_org_idx"
  ON "ApiToken" ("tokenPrefix", "organizationId")
  WHERE "revokedAt" IS NULL;
