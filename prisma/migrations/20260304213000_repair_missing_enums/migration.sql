DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'GrantStatus'
  ) THEN
    CREATE TYPE "GrantStatus" AS ENUM ('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'GrantComplianceStatus'
  ) THEN
    CREATE TYPE "GrantComplianceStatus" AS ENUM ('COMPLIANT', 'AT_RISK', 'OVERDUE', 'NON_COMPLIANT');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'WorkOrderStatus'
  ) THEN
    CREATE TYPE "WorkOrderStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'WorkOrderPriority'
  ) THEN
    CREATE TYPE "WorkOrderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Grant'
      AND column_name = 'status'
      AND udt_name <> 'GrantStatus'
  ) THEN
    ALTER TABLE "Grant"
      ALTER COLUMN "status" TYPE "GrantStatus"
      USING (
        CASE UPPER("status")
          WHEN 'PLANNED' THEN 'PLANNED'::"GrantStatus"
          WHEN 'ACTIVE' THEN 'ACTIVE'::"GrantStatus"
          WHEN 'ON_HOLD' THEN 'ON_HOLD'::"GrantStatus"
          WHEN 'COMPLETED' THEN 'COMPLETED'::"GrantStatus"
          WHEN 'CANCELLED' THEN 'CANCELLED'::"GrantStatus"
          ELSE 'PLANNED'::"GrantStatus"
        END
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Grant'
      AND column_name = 'complianceStatus'
      AND udt_name <> 'GrantComplianceStatus'
  ) THEN
    ALTER TABLE "Grant"
      ALTER COLUMN "complianceStatus" TYPE "GrantComplianceStatus"
      USING (
        CASE
          WHEN "complianceStatus" IS NULL THEN NULL
          WHEN UPPER("complianceStatus") = 'COMPLIANT' THEN 'COMPLIANT'::"GrantComplianceStatus"
          WHEN UPPER("complianceStatus") = 'AT_RISK' THEN 'AT_RISK'::"GrantComplianceStatus"
          WHEN UPPER("complianceStatus") = 'OVERDUE' THEN 'OVERDUE'::"GrantComplianceStatus"
          WHEN UPPER("complianceStatus") = 'NON_COMPLIANT' THEN 'NON_COMPLIANT'::"GrantComplianceStatus"
          ELSE NULL
        END
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'WorkOrder'
      AND column_name = 'status'
      AND udt_name <> 'WorkOrderStatus'
  ) THEN
    ALTER TABLE "WorkOrder" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "WorkOrder"
      ALTER COLUMN "status" TYPE "WorkOrderStatus"
      USING (
        CASE UPPER("status")
          WHEN 'OPEN' THEN 'OPEN'::"WorkOrderStatus"
          WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'::"WorkOrderStatus"
          WHEN 'BLOCKED' THEN 'BLOCKED'::"WorkOrderStatus"
          WHEN 'COMPLETED' THEN 'COMPLETED'::"WorkOrderStatus"
          ELSE 'OPEN'::"WorkOrderStatus"
        END
      );
    ALTER TABLE "WorkOrder" ALTER COLUMN "status" SET DEFAULT 'OPEN';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'WorkOrder'
      AND column_name = 'priority'
      AND udt_name <> 'WorkOrderPriority'
  ) THEN
    ALTER TABLE "WorkOrder"
      ALTER COLUMN "priority" TYPE "WorkOrderPriority"
      USING (
        CASE
          WHEN "priority" IS NULL THEN NULL
          WHEN UPPER("priority") = 'LOW' THEN 'LOW'::"WorkOrderPriority"
          WHEN UPPER("priority") = 'MEDIUM' THEN 'MEDIUM'::"WorkOrderPriority"
          WHEN UPPER("priority") = 'HIGH' THEN 'HIGH'::"WorkOrderPriority"
          WHEN UPPER("priority") = 'URGENT' THEN 'URGENT'::"WorkOrderPriority"
          ELSE NULL
        END
      );
  END IF;
END
$$;
