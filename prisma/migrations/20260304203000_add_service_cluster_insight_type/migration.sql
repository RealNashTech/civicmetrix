DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'InsightType'
      AND e.enumlabel = 'SERVICE_CLUSTER'
  ) THEN
    ALTER TYPE "InsightType" ADD VALUE 'SERVICE_CLUSTER';
  END IF;
END
$$;
