CREATE TABLE "UploadMappingTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "mappingJSON" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadMappingTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UploadMappingTemplate_organizationId_createdAt_idx"
ON "UploadMappingTemplate"("organizationId", "createdAt");

CREATE INDEX "UploadMappingTemplate_organizationId_entityType_idx"
ON "UploadMappingTemplate"("organizationId", "entityType");

ALTER TABLE "UploadMappingTemplate"
ADD CONSTRAINT "UploadMappingTemplate_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
