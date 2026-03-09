ALTER TABLE "DataSource"
ADD COLUMN "datasetType" TEXT NOT NULL DEFAULT 'InfrastructureAsset';

ALTER TABLE "DataSource"
ADD COLUMN "lastSyncAt" TIMESTAMP(3);
