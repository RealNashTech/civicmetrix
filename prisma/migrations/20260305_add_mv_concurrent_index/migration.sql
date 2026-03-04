DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_matviews
    WHERE schemaname = 'public'
      AND matviewname = 'grant_pipeline_summary'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS grant_pipeline_summary_org_unique_idx
    ON grant_pipeline_summary ("organizationId");
  END IF;
END
$$;
