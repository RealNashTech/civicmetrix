-- CreateTable
CREATE TABLE "OperationalInsight" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationalInsight_organizationId_idx" ON "OperationalInsight"("organizationId");

-- CreateIndex
CREATE INDEX "OperationalInsight_severity_idx" ON "OperationalInsight"("severity");

-- AddForeignKey
ALTER TABLE "OperationalInsight" ADD CONSTRAINT "OperationalInsight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
