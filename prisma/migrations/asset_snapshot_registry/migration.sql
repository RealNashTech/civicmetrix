-- CreateTable
CREATE TABLE IF NOT EXISTS "InfrastructureAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfrastructureAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InfrastructureAssetSnapshot" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conditionScore" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfrastructureAssetSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InfrastructureAsset_organizationId_idx" ON "InfrastructureAsset"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InfrastructureAsset_organizationId_name_idx" ON "InfrastructureAsset"("organizationId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InfrastructureAssetSnapshot_assetId_idx" ON "InfrastructureAssetSnapshot"("assetId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InfrastructureAssetSnapshot_organizationId_recordedAt_idx" ON "InfrastructureAssetSnapshot"("organizationId", "recordedAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'InfrastructureAssetSnapshot_assetId_fkey'
  ) THEN
    ALTER TABLE "InfrastructureAssetSnapshot"
      ADD CONSTRAINT "InfrastructureAssetSnapshot_assetId_fkey"
      FOREIGN KEY ("assetId") REFERENCES "InfrastructureAsset"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
