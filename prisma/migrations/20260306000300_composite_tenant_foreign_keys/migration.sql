-- Add composite keys required for tenant-safe foreign keys.
CREATE UNIQUE INDEX IF NOT EXISTS "Department_organizationId_id_key"
  ON "Department" ("organizationId", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "Program_organizationId_id_key"
  ON "Program" ("organizationId", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "Asset_organizationId_id_key"
  ON "Asset" ("organizationId", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "IssueReport_organizationId_id_key"
  ON "IssueReport" ("organizationId", "id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Grant_org_department_tenant_fkey'
  ) THEN
    ALTER TABLE "Grant"
      ADD CONSTRAINT "Grant_org_department_tenant_fkey"
      FOREIGN KEY ("organizationId", "departmentId")
      REFERENCES "Department"("organizationId", "id")
      ON DELETE SET NULL
      ON UPDATE CASCADE
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'KPI_org_program_tenant_fkey'
  ) THEN
    ALTER TABLE "KPI"
      ADD CONSTRAINT "KPI_org_program_tenant_fkey"
      FOREIGN KEY ("organizationId", "programId")
      REFERENCES "Program"("organizationId", "id")
      ON DELETE SET NULL
      ON UPDATE CASCADE
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'IssueReport_org_asset_tenant_fkey'
  ) THEN
    ALTER TABLE "IssueReport"
      ADD CONSTRAINT "IssueReport_org_asset_tenant_fkey"
      FOREIGN KEY ("organizationId", "assetId")
      REFERENCES "Asset"("organizationId", "id")
      ON DELETE SET NULL
      ON UPDATE CASCADE
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'WorkOrder_org_issue_tenant_fkey'
  ) THEN
    ALTER TABLE "WorkOrder"
      ADD CONSTRAINT "WorkOrder_org_issue_tenant_fkey"
      FOREIGN KEY ("organizationId", "issueId")
      REFERENCES "IssueReport"("organizationId", "id")
      ON DELETE SET NULL
      ON UPDATE CASCADE
      NOT VALID;
  END IF;
END
$$;
