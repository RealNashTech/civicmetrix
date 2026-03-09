CREATE TYPE "InfrastructureRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "InfrastructureRisk" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "conditionScore" INTEGER NOT NULL,
    "riskLevel" "InfrastructureRiskLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfrastructureRisk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InfrastructureRisk_organizationId_riskLevel_idx"
ON "InfrastructureRisk"("organizationId", "riskLevel");

CREATE INDEX "InfrastructureRisk_assetId_idx"
ON "InfrastructureRisk"("assetId");

ALTER TABLE "InfrastructureRisk"
ADD CONSTRAINT "InfrastructureRisk_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InfrastructureRisk"
ADD CONSTRAINT "InfrastructureRisk_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "InfrastructureAsset"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
