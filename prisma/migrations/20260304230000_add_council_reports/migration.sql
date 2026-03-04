-- CreateTable
CREATE TABLE "CouncilReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouncilReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CouncilReport_organizationId_idx" ON "CouncilReport"("organizationId");

-- CreateIndex
CREATE INDEX "CouncilReport_organizationId_createdAt_idx" ON "CouncilReport"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "CouncilReport" ADD CONSTRAINT "CouncilReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
