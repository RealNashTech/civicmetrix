-- AlterTable
ALTER TABLE "Grant"
  ALTER COLUMN "awardAmount" TYPE DECIMAL(12,2)
  USING CASE
    WHEN "awardAmount" IS NULL THEN NULL
    ELSE "awardAmount"::DECIMAL(12,2)
  END;

-- CreateIndex
CREATE INDEX "Grant_organizationId_status_idx" ON "Grant"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Grant_organizationId_applicationDeadline_idx" ON "Grant"("organizationId", "applicationDeadline");
