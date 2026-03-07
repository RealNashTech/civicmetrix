-- Complete tenant RLS coverage and enforce deny-by-default posture.
-- Tenant context key: current_setting('app.current_tenant', true)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'civicmetrix_app') THEN
    EXECUTE 'ALTER ROLE civicmetrix_app NOBYPASSRLS';
  END IF;
END
$$;

-- Ensure high-risk org-scoped tables are explicitly enforced.
ALTER TABLE "KPI" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kpi_tenant_select_policy ON "KPI";
DROP POLICY IF EXISTS kpi_tenant_insert_policy ON "KPI";
DROP POLICY IF EXISTS kpi_tenant_update_policy ON "KPI";
DROP POLICY IF EXISTS kpi_tenant_delete_policy ON "KPI";
CREATE POLICY kpi_tenant_select_policy ON "KPI"
  FOR SELECT USING ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY kpi_tenant_insert_policy ON "KPI"
  FOR INSERT WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY kpi_tenant_update_policy ON "KPI"
  FOR UPDATE USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY kpi_tenant_delete_policy ON "KPI"
  FOR DELETE USING ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "KPI" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Grant" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grant_tenant_select_policy ON "Grant";
DROP POLICY IF EXISTS grant_tenant_insert_policy ON "Grant";
DROP POLICY IF EXISTS grant_tenant_update_policy ON "Grant";
DROP POLICY IF EXISTS grant_tenant_delete_policy ON "Grant";
CREATE POLICY grant_tenant_select_policy ON "Grant"
  FOR SELECT USING ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY grant_tenant_insert_policy ON "Grant"
  FOR INSERT WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY grant_tenant_update_policy ON "Grant"
  FOR UPDATE USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY grant_tenant_delete_policy ON "Grant"
  FOR DELETE USING ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "Grant" FORCE ROW LEVEL SECURITY;

ALTER TABLE "IssueReport" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS issue_report_tenant_select_policy ON "IssueReport";
DROP POLICY IF EXISTS issue_report_tenant_insert_policy ON "IssueReport";
DROP POLICY IF EXISTS issue_report_tenant_update_policy ON "IssueReport";
DROP POLICY IF EXISTS issue_report_tenant_delete_policy ON "IssueReport";
CREATE POLICY issue_report_tenant_select_policy ON "IssueReport"
  FOR SELECT USING ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY issue_report_tenant_insert_policy ON "IssueReport"
  FOR INSERT WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY issue_report_tenant_update_policy ON "IssueReport"
  FOR UPDATE USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY issue_report_tenant_delete_policy ON "IssueReport"
  FOR DELETE USING ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "IssueReport" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Program" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS program_tenant_policy ON "Program";
CREATE POLICY program_tenant_policy ON "Program"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "Program" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS department_tenant_policy ON "Department";
CREATE POLICY department_tenant_policy ON "Department"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "Department" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS asset_tenant_select_policy ON "Asset";
DROP POLICY IF EXISTS asset_tenant_insert_policy ON "Asset";
DROP POLICY IF EXISTS asset_tenant_update_policy ON "Asset";
DROP POLICY IF EXISTS asset_tenant_delete_policy ON "Asset";
CREATE POLICY asset_tenant_select_policy ON "Asset"
  FOR SELECT USING ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY asset_tenant_insert_policy ON "Asset"
  FOR INSERT WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY asset_tenant_update_policy ON "Asset"
  FOR UPDATE USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY asset_tenant_delete_policy ON "Asset"
  FOR DELETE USING ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "Asset" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS event_tenant_policy ON "Event";
CREATE POLICY event_tenant_policy ON "Event"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "Event" FORCE ROW LEVEL SECURITY;

-- Remaining tenant tables missing RLS in prior migrations.
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

ALTER TABLE "IssueComment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS issue_comment_tenant_policy ON "IssueComment";
CREATE POLICY issue_comment_tenant_policy ON "IssueComment"
  USING (
    EXISTS (
      SELECT 1 FROM "IssueReport" ir
      WHERE ir."id" = "IssueComment"."issueId"
        AND ir."organizationId"::text = current_setting('app.current_tenant', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "IssueReport" ir
      WHERE ir."id" = "IssueComment"."issueId"
        AND ir."organizationId"::text = current_setting('app.current_tenant', true)
    )
  );
ALTER TABLE "IssueComment" FORCE ROW LEVEL SECURITY;

ALTER TABLE "District" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS district_tenant_policy ON "District";
CREATE POLICY district_tenant_policy ON "District"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "District" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Ward" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ward_tenant_policy ON "Ward";
CREATE POLICY ward_tenant_policy ON "Ward"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "Ward" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ServiceZone" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_zone_tenant_policy ON "ServiceZone";
CREATE POLICY service_zone_tenant_policy ON "ServiceZone"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "ServiceZone" FORCE ROW LEVEL SECURITY;

ALTER TABLE "InfrastructureLayer" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS infrastructure_layer_tenant_policy ON "InfrastructureLayer";
CREATE POLICY infrastructure_layer_tenant_policy ON "InfrastructureLayer"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "InfrastructureLayer" FORCE ROW LEVEL SECURITY;

ALTER TABLE "SLAPolicy" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sla_policy_tenant_policy ON "SLAPolicy";
CREATE POLICY sla_policy_tenant_policy ON "SLAPolicy"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "SLAPolicy" FORCE ROW LEVEL SECURITY;

ALTER TABLE "KPIHistory" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kpi_history_tenant_policy ON "KPIHistory";
CREATE POLICY kpi_history_tenant_policy ON "KPIHistory"
  USING (
    EXISTS (
      SELECT 1 FROM "KPI" k
      WHERE k."id" = "KPIHistory"."kpiId"
        AND k."organizationId"::text = current_setting('app.current_tenant', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "KPI" k
      WHERE k."id" = "KPIHistory"."kpiId"
        AND k."organizationId"::text = current_setting('app.current_tenant', true)
    )
  );
ALTER TABLE "KPIHistory" FORCE ROW LEVEL SECURITY;

ALTER TABLE "GrantMetric" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grant_metric_tenant_policy ON "GrantMetric";
CREATE POLICY grant_metric_tenant_policy ON "GrantMetric"
  USING (
    EXISTS (
      SELECT 1 FROM "Grant" g
      WHERE g."id" = "GrantMetric"."grantId"
        AND g."organizationId"::text = current_setting('app.current_tenant', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Grant" g
      WHERE g."id" = "GrantMetric"."grantId"
        AND g."organizationId"::text = current_setting('app.current_tenant', true)
    )
  );
ALTER TABLE "GrantMetric" FORCE ROW LEVEL SECURITY;

ALTER TABLE "DepartmentPermission" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS department_permission_tenant_policy ON "DepartmentPermission";
CREATE POLICY department_permission_tenant_policy ON "DepartmentPermission"
  USING (
    EXISTS (
      SELECT 1 FROM "Department" d
      WHERE d."id" = "DepartmentPermission"."departmentId"
        AND d."organizationId"::text = current_setting('app.current_tenant', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Department" d
      WHERE d."id" = "DepartmentPermission"."departmentId"
        AND d."organizationId"::text = current_setting('app.current_tenant', true)
    )
  );
ALTER TABLE "DepartmentPermission" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Dashboard" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dashboard_tenant_policy ON "Dashboard";
CREATE POLICY dashboard_tenant_policy ON "Dashboard"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "Dashboard" FORCE ROW LEVEL SECURITY;
