-- AlterTable
ALTER TABLE "KPI" ADD COLUMN     "milestoneId" TEXT;

-- CreateTable
CREATE TABLE "GrantMilestone" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrantMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantDeliverable" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrantDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrantMilestone_grantId_idx" ON "GrantMilestone"("grantId");

-- CreateIndex
CREATE INDEX "GrantMilestone_dueDate_idx" ON "GrantMilestone"("dueDate");

-- CreateIndex
CREATE INDEX "GrantDeliverable_milestoneId_idx" ON "GrantDeliverable"("milestoneId");

-- CreateIndex
CREATE INDEX "KPI_milestoneId_idx" ON "KPI"("milestoneId");

-- AddForeignKey
ALTER TABLE "KPI" ADD CONSTRAINT "KPI_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "GrantMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantMilestone" ADD CONSTRAINT "GrantMilestone_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "Grant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantDeliverable" ADD CONSTRAINT "GrantDeliverable_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "GrantMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
