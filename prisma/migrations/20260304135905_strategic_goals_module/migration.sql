-- AlterTable
ALTER TABLE "Grant" ADD COLUMN     "complianceStatus" TEXT,
ADD COLUMN     "lastReportSubmitted" TIMESTAMP(3),
ADD COLUMN     "nextReportDue" TIMESTAMP(3),
ADD COLUMN     "reportingFrequency" TEXT;

-- CreateTable
CREATE TABLE "StrategicGoal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategicGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicObjective" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "programId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StrategicObjective_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StrategicGoal_organizationId_createdAt_idx" ON "StrategicGoal"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "StrategicObjective_goalId_idx" ON "StrategicObjective"("goalId");

-- CreateIndex
CREATE INDEX "StrategicObjective_programId_idx" ON "StrategicObjective"("programId");

-- AddForeignKey
ALTER TABLE "StrategicGoal" ADD CONSTRAINT "StrategicGoal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicObjective" ADD CONSTRAINT "StrategicObjective_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "StrategicGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicObjective" ADD CONSTRAINT "StrategicObjective_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
