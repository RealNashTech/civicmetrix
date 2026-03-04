-- CreateTable
CREATE TABLE "KPIHistory" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KPIHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KPIHistory_kpiId_idx" ON "KPIHistory"("kpiId");

-- CreateIndex
CREATE INDEX "KPIHistory_recordedAt_idx" ON "KPIHistory"("recordedAt");

-- AddForeignKey
ALTER TABLE "KPIHistory" ADD CONSTRAINT "KPIHistory_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "KPI"("id") ON DELETE CASCADE ON UPDATE CASCADE;
