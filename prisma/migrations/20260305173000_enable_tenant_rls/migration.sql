-- Phase 2: tenant isolation with PostgreSQL RLS.
-- Tenant context is provided via: current_setting('app.current_tenant', true)

-- Organization is root-tenant metadata. We permit bootstrap inserts when tenant is not set.
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_select_policy ON "Organization";
DROP POLICY IF EXISTS organization_insert_policy ON "Organization";
DROP POLICY IF EXISTS organization_update_policy ON "Organization";
DROP POLICY IF EXISTS organization_delete_policy ON "Organization";
CREATE POLICY organization_select_policy
  ON "Organization"
  FOR SELECT
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "id"::text = current_setting('app.current_tenant', true)
  );
CREATE POLICY organization_insert_policy
  ON "Organization"
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_tenant', true) IS NULL
    OR "id"::text = current_setting('app.current_tenant', true)
  );
CREATE POLICY organization_update_policy
  ON "Organization"
  FOR UPDATE
  USING ("id"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("id"::text = current_setting('app.current_tenant', true));
CREATE POLICY organization_delete_policy
  ON "Organization"
  FOR DELETE
  USING ("id"::text = current_setting('app.current_tenant', true));

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_tenant_select_policy ON "User";
DROP POLICY IF EXISTS user_tenant_insert_policy ON "User";
DROP POLICY IF EXISTS user_tenant_update_policy ON "User";
DROP POLICY IF EXISTS user_tenant_delete_policy ON "User";
CREATE POLICY user_tenant_select_policy
  ON "User"
  FOR SELECT
  USING ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY user_tenant_insert_policy
  ON "User"
  FOR INSERT
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY user_tenant_update_policy
  ON "User"
  FOR UPDATE
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY user_tenant_delete_policy
  ON "User"
  FOR DELETE
  USING ("organizationId"::text = current_setting('app.current_tenant', true));

ALTER TABLE "KPI" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kpi_tenant_select_policy ON "KPI";
DROP POLICY IF EXISTS kpi_tenant_insert_policy ON "KPI";
DROP POLICY IF EXISTS kpi_tenant_update_policy ON "KPI";
DROP POLICY IF EXISTS kpi_tenant_delete_policy ON "KPI";
CREATE POLICY kpi_tenant_select_policy
  ON "KPI"
  FOR SELECT
  USING ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY kpi_tenant_insert_policy
  ON "KPI"
  FOR INSERT
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY kpi_tenant_update_policy
  ON "KPI"
  FOR UPDATE
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY kpi_tenant_delete_policy
  ON "KPI"
  FOR DELETE
  USING ("organizationId"::text = current_setting('app.current_tenant', true));

ALTER TABLE "Grant" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grant_tenant_select_policy ON "Grant";
DROP POLICY IF EXISTS grant_tenant_insert_policy ON "Grant";
DROP POLICY IF EXISTS grant_tenant_update_policy ON "Grant";
DROP POLICY IF EXISTS grant_tenant_delete_policy ON "Grant";
CREATE POLICY grant_tenant_select_policy
  ON "Grant"
  FOR SELECT
  USING ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY grant_tenant_insert_policy
  ON "Grant"
  FOR INSERT
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY grant_tenant_update_policy
  ON "Grant"
  FOR UPDATE
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY grant_tenant_delete_policy
  ON "Grant"
  FOR DELETE
  USING ("organizationId"::text = current_setting('app.current_tenant', true));

ALTER TABLE "IssueReport" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS issue_report_tenant_select_policy ON "IssueReport";
DROP POLICY IF EXISTS issue_report_tenant_insert_policy ON "IssueReport";
DROP POLICY IF EXISTS issue_report_tenant_update_policy ON "IssueReport";
DROP POLICY IF EXISTS issue_report_tenant_delete_policy ON "IssueReport";
CREATE POLICY issue_report_tenant_select_policy
  ON "IssueReport"
  FOR SELECT
  USING ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY issue_report_tenant_insert_policy
  ON "IssueReport"
  FOR INSERT
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY issue_report_tenant_update_policy
  ON "IssueReport"
  FOR UPDATE
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY issue_report_tenant_delete_policy
  ON "IssueReport"
  FOR DELETE
  USING ("organizationId"::text = current_setting('app.current_tenant', true));

ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS asset_tenant_select_policy ON "Asset";
DROP POLICY IF EXISTS asset_tenant_insert_policy ON "Asset";
DROP POLICY IF EXISTS asset_tenant_update_policy ON "Asset";
DROP POLICY IF EXISTS asset_tenant_delete_policy ON "Asset";
CREATE POLICY asset_tenant_select_policy
  ON "Asset"
  FOR SELECT
  USING ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY asset_tenant_insert_policy
  ON "Asset"
  FOR INSERT
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY asset_tenant_update_policy
  ON "Asset"
  FOR UPDATE
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY asset_tenant_delete_policy
  ON "Asset"
  FOR DELETE
  USING ("organizationId"::text = current_setting('app.current_tenant', true));

ALTER TABLE "WorkOrder" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_order_tenant_select_policy ON "WorkOrder";
DROP POLICY IF EXISTS work_order_tenant_insert_policy ON "WorkOrder";
DROP POLICY IF EXISTS work_order_tenant_update_policy ON "WorkOrder";
DROP POLICY IF EXISTS work_order_tenant_delete_policy ON "WorkOrder";
CREATE POLICY work_order_tenant_select_policy
  ON "WorkOrder"
  FOR SELECT
  USING ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY work_order_tenant_insert_policy
  ON "WorkOrder"
  FOR INSERT
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY work_order_tenant_update_policy
  ON "WorkOrder"
  FOR UPDATE
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY work_order_tenant_delete_policy
  ON "WorkOrder"
  FOR DELETE
  USING ("organizationId"::text = current_setting('app.current_tenant', true));

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_log_tenant_select_policy ON "AuditLog";
DROP POLICY IF EXISTS audit_log_tenant_insert_policy ON "AuditLog";
DROP POLICY IF EXISTS audit_log_tenant_update_policy ON "AuditLog";
DROP POLICY IF EXISTS audit_log_tenant_delete_policy ON "AuditLog";
CREATE POLICY audit_log_tenant_select_policy
  ON "AuditLog"
  FOR SELECT
  USING ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY audit_log_tenant_insert_policy
  ON "AuditLog"
  FOR INSERT
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY audit_log_tenant_update_policy
  ON "AuditLog"
  FOR UPDATE
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY audit_log_tenant_delete_policy
  ON "AuditLog"
  FOR DELETE
  USING ("organizationId"::text = current_setting('app.current_tenant', true));

ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_tenant_select_policy ON "Document";
DROP POLICY IF EXISTS document_tenant_insert_policy ON "Document";
DROP POLICY IF EXISTS document_tenant_update_policy ON "Document";
DROP POLICY IF EXISTS document_tenant_delete_policy ON "Document";
CREATE POLICY document_tenant_select_policy
  ON "Document"
  FOR SELECT
  USING ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY document_tenant_insert_policy
  ON "Document"
  FOR INSERT
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY document_tenant_update_policy
  ON "Document"
  FOR UPDATE
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY document_tenant_delete_policy
  ON "Document"
  FOR DELETE
  USING ("organizationId"::text = current_setting('app.current_tenant', true));

ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alert_tenant_select_policy ON "Alert";
DROP POLICY IF EXISTS alert_tenant_insert_policy ON "Alert";
DROP POLICY IF EXISTS alert_tenant_update_policy ON "Alert";
DROP POLICY IF EXISTS alert_tenant_delete_policy ON "Alert";
CREATE POLICY alert_tenant_select_policy
  ON "Alert"
  FOR SELECT
  USING ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY alert_tenant_insert_policy
  ON "Alert"
  FOR INSERT
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY alert_tenant_update_policy
  ON "Alert"
  FOR UPDATE
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY alert_tenant_delete_policy
  ON "Alert"
  FOR DELETE
  USING ("organizationId"::text = current_setting('app.current_tenant', true));

ALTER TABLE "Insight" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS insight_tenant_select_policy ON "Insight";
DROP POLICY IF EXISTS insight_tenant_insert_policy ON "Insight";
DROP POLICY IF EXISTS insight_tenant_update_policy ON "Insight";
DROP POLICY IF EXISTS insight_tenant_delete_policy ON "Insight";
CREATE POLICY insight_tenant_select_policy
  ON "Insight"
  FOR SELECT
  USING ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY insight_tenant_insert_policy
  ON "Insight"
  FOR INSERT
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY insight_tenant_update_policy
  ON "Insight"
  FOR UPDATE
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
CREATE POLICY insight_tenant_delete_policy
  ON "Insight"
  FOR DELETE
  USING ("organizationId"::text = current_setting('app.current_tenant', true));
