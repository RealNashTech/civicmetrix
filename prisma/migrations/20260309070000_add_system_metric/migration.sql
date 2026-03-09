-- CreateTable
CREATE TABLE "SystemMetric" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemMetric_organizationId_idx" ON "SystemMetric"("organizationId");

-- CreateIndex
CREATE INDEX "SystemMetric_metricType_idx" ON "SystemMetric"("metricType");

-- CreateIndex
CREATE INDEX "SystemMetric_org_severity_idx" ON "SystemMetric"("organizationId", "severity");

-- CreateIndex
CREATE INDEX "SystemMetric_org_type_created_idx" ON "SystemMetric"("organizationId", "metricType", "createdAt");

-- AddForeignKey
ALTER TABLE "SystemMetric" ADD CONSTRAINT "SystemMetric_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
