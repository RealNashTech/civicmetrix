CREATE TABLE "DataQualityMetric" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "datasetType" TEXT NOT NULL,
    "totalRecords" INTEGER NOT NULL,
    "missingFieldCount" INTEGER NOT NULL,
    "validationFailureCount" INTEGER NOT NULL,
    "lastImportSessionId" TEXT,
    "qualityScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataQualityMetric_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DataQualityMetric_organizationId_datasetType_idx"
ON "DataQualityMetric"("organizationId", "datasetType");

ALTER TABLE "DataQualityMetric"
ADD CONSTRAINT "DataQualityMetric_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DataQualityMetric"
ADD CONSTRAINT "DataQualityMetric_lastImportSessionId_fkey"
FOREIGN KEY ("lastImportSessionId") REFERENCES "ImportSession"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
