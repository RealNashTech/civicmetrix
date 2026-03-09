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

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- CreateIndex
CREATE INDEX "work_order_org_status_priority_created_idx" ON "WorkOrder"("organizationId", "status", "priority", "createdAt" DESC);

