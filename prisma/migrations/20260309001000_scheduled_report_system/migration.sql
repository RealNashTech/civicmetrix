-- migration-safety: reviewed
-- AlterTable
ALTER TABLE "WorkOrder" DROP COLUMN "scheduledDate",
ADD COLUMN     "actualCost" DOUBLE PRECISION,
ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "estimatedCost" DOUBLE PRECISION,
ADD COLUMN     "startedAt" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'OPEN',
DROP COLUMN "priority",
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'NORMAL';

-- DropEnum
DROP TYPE "WorkOrderStatus";

-- DropEnum
DROP TYPE "WorkOrderPriority";

-- CreateTable
CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "emailRecipients" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledReport_organizationId_idx" ON "ScheduledReport"("organizationId");

-- CreateIndex
CREATE INDEX "ScheduledReport_organizationId_nextRunAt_idx" ON "ScheduledReport"("organizationId", "nextRunAt");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- CreateIndex
CREATE INDEX "work_order_org_status_priority_created_idx" ON "WorkOrder"("organizationId", "status", "priority", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
