-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- Expand
ALTER TABLE "IssueReport"
ADD COLUMN "assignedDepartmentId" TEXT,
ADD COLUMN "assignedUserId" TEXT,
ADD COLUMN "priority" "IssuePriority",
ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Backfill
UPDATE "IssueReport"
SET "updatedAt" = COALESCE("updatedAt", "createdAt", NOW())
WHERE "updatedAt" IS NULL;

-- Contract
ALTER TABLE "IssueReport"
ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateIndex
CREATE INDEX "IssueReport_assignedDepartmentId_idx" ON "IssueReport"("assignedDepartmentId");

-- CreateIndex
CREATE INDEX "IssueReport_priority_idx" ON "IssueReport"("priority");

-- AddForeignKey
ALTER TABLE "IssueReport" ADD CONSTRAINT "IssueReport_assignedDepartmentId_fkey" FOREIGN KEY ("assignedDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
