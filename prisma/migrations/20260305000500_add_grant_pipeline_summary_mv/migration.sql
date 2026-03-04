CREATE MATERIALIZED VIEW "grant_pipeline_summary" AS
SELECT
  "organizationId",
  COUNT(*) FILTER (WHERE status = 'PIPELINE') AS pipeline_count,
  COUNT(*) FILTER (WHERE status = 'SUBMITTED') AS submitted_count,
  SUM("awardAmount") FILTER (WHERE status = 'AWARDED') AS awarded_total
FROM "Grant"
GROUP BY "organizationId";

CREATE INDEX "grant_pipeline_summary_organizationId_idx"
  ON "grant_pipeline_summary"("organizationId");
