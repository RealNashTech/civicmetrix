-- Step 7 remediation: ensure legacy migration targets are safe on non-empty databases.

-- service_request_workflow remediation
ALTER TABLE "IssueReport"
  ADD COLUMN IF NOT EXISTS "updatedAt_tmp" TIMESTAMP(3);

UPDATE "IssueReport"
SET "updatedAt_tmp" = COALESCE("updatedAt_tmp", "updatedAt", "createdAt", NOW())
WHERE "updatedAt_tmp" IS NULL;

ALTER TABLE "IssueReport"
  DROP COLUMN IF EXISTS "updatedAt";

ALTER TABLE "IssueReport"
  RENAME COLUMN "updatedAt_tmp" TO "updatedAt";

ALTER TABLE "IssueReport"
  ALTER COLUMN "updatedAt" SET NOT NULL;

-- secure_api_tokens remediation
ALTER TABLE "ApiToken"
  ADD COLUMN IF NOT EXISTS "scope_tmp" TEXT,
  ADD COLUMN IF NOT EXISTS "tokenHash_tmp" TEXT;

UPDATE "ApiToken"
SET
  "scope_tmp" = COALESCE(NULLIF("scope_tmp", ''), NULLIF("scope", ''), 'legacy:unknown'),
  "tokenHash_tmp" = COALESCE(NULLIF("tokenHash_tmp", ''), NULLIF("tokenHash", ''), md5("id" || ':' || "name"));

ALTER TABLE "ApiToken"
  DROP COLUMN IF EXISTS "scope",
  DROP COLUMN IF EXISTS "tokenHash";

ALTER TABLE "ApiToken"
  RENAME COLUMN "scope_tmp" TO "scope";

ALTER TABLE "ApiToken"
  RENAME COLUMN "tokenHash_tmp" TO "tokenHash";

ALTER TABLE "ApiToken"
  ALTER COLUMN "scope" SET NOT NULL,
  ALTER COLUMN "tokenHash" SET NOT NULL;
