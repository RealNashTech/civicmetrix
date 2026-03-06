-- Expand tenant RLS coverage to remaining tenant tables.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'civicmetrix_app') THEN
    EXECUTE 'ALTER ROLE civicmetrix_app NOBYPASSRLS';
  END IF;
END
$$;

ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS department_tenant_policy ON "Department";
CREATE POLICY department_tenant_policy
  ON "Department"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "Department" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Program" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS program_tenant_policy ON "Program";
CREATE POLICY program_tenant_policy
  ON "Program"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "Program" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS budget_tenant_policy ON "Budget";
CREATE POLICY budget_tenant_policy
  ON "Budget"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "Budget" FORCE ROW LEVEL SECURITY;

ALTER TABLE "StrategicGoal" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS strategic_goal_tenant_policy ON "StrategicGoal";
CREATE POLICY strategic_goal_tenant_policy
  ON "StrategicGoal"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "StrategicGoal" FORCE ROW LEVEL SECURITY;

ALTER TABLE "StrategicObjective" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS strategic_objective_tenant_policy ON "StrategicObjective";
CREATE POLICY strategic_objective_tenant_policy
  ON "StrategicObjective"
  USING (
    EXISTS (
      SELECT 1
      FROM "StrategicGoal" sg
      WHERE sg."id" = "StrategicObjective"."goalId"
        AND sg."organizationId"::text = current_setting('app.current_tenant', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "StrategicGoal" sg
      WHERE sg."id" = "StrategicObjective"."goalId"
        AND sg."organizationId"::text = current_setting('app.current_tenant', true)
    )
  );
ALTER TABLE "StrategicObjective" FORCE ROW LEVEL SECURITY;

ALTER TABLE "GrantMilestone" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grant_milestone_tenant_policy ON "GrantMilestone";
CREATE POLICY grant_milestone_tenant_policy
  ON "GrantMilestone"
  USING (
    EXISTS (
      SELECT 1
      FROM "Grant" g
      WHERE g."id" = "GrantMilestone"."grantId"
        AND g."organizationId"::text = current_setting('app.current_tenant', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "Grant" g
      WHERE g."id" = "GrantMilestone"."grantId"
        AND g."organizationId"::text = current_setting('app.current_tenant', true)
    )
  );
ALTER TABLE "GrantMilestone" FORCE ROW LEVEL SECURITY;

ALTER TABLE "GrantDeliverable" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grant_deliverable_tenant_policy ON "GrantDeliverable";
CREATE POLICY grant_deliverable_tenant_policy
  ON "GrantDeliverable"
  USING (
    EXISTS (
      SELECT 1
      FROM "GrantMilestone" gm
      JOIN "Grant" g ON g."id" = gm."grantId"
      WHERE gm."id" = "GrantDeliverable"."milestoneId"
        AND g."organizationId"::text = current_setting('app.current_tenant', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "GrantMilestone" gm
      JOIN "Grant" g ON g."id" = gm."grantId"
      WHERE gm."id" = "GrantDeliverable"."milestoneId"
        AND g."organizationId"::text = current_setting('app.current_tenant', true)
    )
  );
ALTER TABLE "GrantDeliverable" FORCE ROW LEVEL SECURITY;

ALTER TABLE "MaintenanceSchedule" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS maintenance_schedule_tenant_policy ON "MaintenanceSchedule";
CREATE POLICY maintenance_schedule_tenant_policy
  ON "MaintenanceSchedule"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "MaintenanceSchedule" FORCE ROW LEVEL SECURITY;

ALTER TABLE "CouncilReport" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS council_report_tenant_policy ON "CouncilReport";
CREATE POLICY council_report_tenant_policy
  ON "CouncilReport"
  USING ("organizationId"::text = current_setting('app.current_tenant', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_tenant', true));
ALTER TABLE "CouncilReport" FORCE ROW LEVEL SECURITY;

ALTER TABLE "CitizenNotification" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS citizen_notification_tenant_policy ON "CitizenNotification";
CREATE POLICY citizen_notification_tenant_policy
  ON "CitizenNotification"
  USING (
    EXISTS (
      SELECT 1
      FROM "Citizen" c
      WHERE c."id" = "CitizenNotification"."citizenId"
        AND c."organizationId"::text = current_setting('app.current_tenant', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "Citizen" c
      WHERE c."id" = "CitizenNotification"."citizenId"
        AND c."organizationId"::text = current_setting('app.current_tenant', true)
    )
  );
ALTER TABLE "CitizenNotification" FORCE ROW LEVEL SECURITY;
