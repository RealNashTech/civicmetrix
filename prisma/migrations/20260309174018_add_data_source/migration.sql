CREATE TYPE "DataSourceType" AS ENUM ('GOOGLE_SHEETS', 'MICROSOFT_EXCEL');

CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "DataSourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sheetName" TEXT,
    "range" TEXT,
    "refreshMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DataSource_organizationId_idx"
ON "DataSource"("organizationId");

ALTER TABLE "DataSource"
ADD CONSTRAINT "DataSource_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
