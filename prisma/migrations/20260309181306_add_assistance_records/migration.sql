CREATE TABLE "AssistanceRecord" (
"id" TEXT PRIMARY KEY,
"organizationId" TEXT NOT NULL,
"organizationName" TEXT NOT NULL,
"programName" TEXT NOT NULL,
"category" TEXT NOT NULL,
"householdsServed" INTEGER NOT NULL,
"reportDate" TIMESTAMP(3) NOT NULL,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "AssistanceRecord"
ADD CONSTRAINT "AssistanceRecord_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE CASCADE;

CREATE INDEX "AssistanceRecord_organizationId_idx"
ON "AssistanceRecord" ("organizationId");
