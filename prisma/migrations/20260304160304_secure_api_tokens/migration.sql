-- Expand
DROP INDEX IF EXISTS "ApiToken_organizationId_createdAt_idx";
DROP INDEX IF EXISTS "ApiToken_token_key";

ALTER TABLE "ApiToken"
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "scope" TEXT,
  ADD COLUMN IF NOT EXISTS "tokenHash" TEXT;

-- Backfill for non-empty tables
UPDATE "ApiToken"
SET
  "scope" = COALESCE(NULLIF("scope", ''), 'legacy:full'),
  "tokenHash" = COALESCE(NULLIF("tokenHash", ''), md5(COALESCE("token", "id" || ':' || "name")))
WHERE "scope" IS NULL OR "tokenHash" IS NULL;

-- Contract
ALTER TABLE "ApiToken"
  ALTER COLUMN "scope" SET NOT NULL,
  ALTER COLUMN "tokenHash" SET NOT NULL;

ALTER TABLE "ApiToken" DROP COLUMN IF EXISTS "token";

CREATE INDEX IF NOT EXISTS "ApiToken_organizationId_idx" ON "ApiToken"("organizationId");
CREATE INDEX IF NOT EXISTS "ApiToken_revokedAt_idx" ON "ApiToken"("revokedAt");
