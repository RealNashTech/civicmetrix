-- Validate tenant FK constraints that were created as NOT VALID.

ALTER TABLE "Grant" VALIDATE CONSTRAINT "Grant_org_department_tenant_fkey";
ALTER TABLE "KPI" VALIDATE CONSTRAINT "KPI_org_program_tenant_fkey";
ALTER TABLE "IssueReport" VALIDATE CONSTRAINT "IssueReport_org_asset_tenant_fkey";
ALTER TABLE "WorkOrder" VALIDATE CONSTRAINT "WorkOrder_org_issue_tenant_fkey";
