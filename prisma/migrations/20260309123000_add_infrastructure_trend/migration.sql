CREATE TYPE "InfrastructureTrendDirection" AS ENUM ('IMPROVING', 'STABLE', 'DECLINING');

CREATE TABLE "InfrastructureTrend" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "trendDirection" "InfrastructureTrendDirection" NOT NULL,
    "scoreChange" INTEGER NOT NULL,
    "firstScore" INTEGER NOT NULL,
    "latestScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfrastructureTrend_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InfrastructureTrend_organizationId_trendDirection_idx"
ON "InfrastructureTrend"("organizationId", "trendDirection");

CREATE INDEX "InfrastructureTrend_assetId_idx"
ON "InfrastructureTrend"("assetId");

ALTER TABLE "InfrastructureTrend"
ADD CONSTRAINT "InfrastructureTrend_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InfrastructureTrend"
ADD CONSTRAINT "InfrastructureTrend_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "InfrastructureAsset"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
