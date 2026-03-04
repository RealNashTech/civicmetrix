-- AlterTable
ALTER TABLE "IssueReport" ADD COLUMN     "slaBreached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slaResolutionDueAt" TIMESTAMP(3),
ADD COLUMN     "slaResponseDueAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SLAPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "issueCategory" TEXT NOT NULL,
    "responseHours" INTEGER NOT NULL,
    "resolutionHours" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SLAPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SLAPolicy_organizationId_idx" ON "SLAPolicy"("organizationId");

-- CreateIndex
CREATE INDEX "SLAPolicy_issueCategory_idx" ON "SLAPolicy"("issueCategory");

-- AddForeignKey
ALTER TABLE "SLAPolicy" ADD CONSTRAINT "SLAPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
