-- CreateEnum
CREATE TYPE "GrantStatus_new" AS ENUM ('PIPELINE', 'DRAFT', 'SUBMITTED', 'AWARDED', 'REPORTING', 'CLOSED');

-- AlterTable
ALTER TABLE "Grant"
  ADD COLUMN "applicationDeadline" TIMESTAMP(3),
  ADD COLUMN "awardAmount" DOUBLE PRECISION,
  ADD COLUMN "reportDueDate" TIMESTAMP(3);

-- Migrate existing Grant.status values into the new lifecycle enum
ALTER TABLE "Grant" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Grant"
  ALTER COLUMN "status" TYPE "GrantStatus_new"
  USING (
    CASE "status"::text
      WHEN 'PLANNED' THEN 'PIPELINE'::"GrantStatus_new"
      WHEN 'ACTIVE' THEN 'AWARDED'::"GrantStatus_new"
      WHEN 'ON_HOLD' THEN 'DRAFT'::"GrantStatus_new"
      WHEN 'COMPLETED' THEN 'CLOSED'::"GrantStatus_new"
      WHEN 'CANCELLED' THEN 'CLOSED'::"GrantStatus_new"
      WHEN 'PIPELINE' THEN 'PIPELINE'::"GrantStatus_new"
      WHEN 'DRAFT' THEN 'DRAFT'::"GrantStatus_new"
      WHEN 'SUBMITTED' THEN 'SUBMITTED'::"GrantStatus_new"
      WHEN 'AWARDED' THEN 'AWARDED'::"GrantStatus_new"
      WHEN 'REPORTING' THEN 'REPORTING'::"GrantStatus_new"
      WHEN 'CLOSED' THEN 'CLOSED'::"GrantStatus_new"
      ELSE 'PIPELINE'::"GrantStatus_new"
    END
  );

-- Replace old enum type
DROP TYPE "GrantStatus";
ALTER TYPE "GrantStatus_new" RENAME TO "GrantStatus";

-- Set new default
ALTER TABLE "Grant" ALTER COLUMN "status" SET DEFAULT 'PIPELINE';
