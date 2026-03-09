CREATE TABLE "DatasetType" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetTable" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatasetType_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DatasetType_name_idx" ON "DatasetType"("name");
CREATE INDEX "DatasetType_organizationId_name_idx" ON "DatasetType"("organizationId", "name");

ALTER TABLE "DatasetType"
ADD CONSTRAINT "DatasetType_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UploadMappingTemplate"
ADD COLUMN "datasetType" TEXT;

UPDATE "UploadMappingTemplate"
SET "datasetType" = COALESCE("entityType", 'InfrastructureAsset')
WHERE "datasetType" IS NULL;

ALTER TABLE "UploadMappingTemplate"
ALTER COLUMN "datasetType" SET NOT NULL;

CREATE INDEX "UploadMappingTemplate_organizationId_datasetType_idx"
ON "UploadMappingTemplate"("organizationId", "datasetType");
