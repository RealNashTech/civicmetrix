CREATE TABLE "GoogleIntegration" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL UNIQUE,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT,
  "expiryDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "GoogleIntegration"
ADD CONSTRAINT "GoogleIntegration_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE;

CREATE INDEX "GoogleIntegration_organizationId_idx"
ON "GoogleIntegration" ("organizationId");
