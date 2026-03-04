WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "organizationId", "title"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS row_num
  FROM "Alert"
  WHERE "resolvedAt" IS NULL
)
DELETE FROM "Alert"
WHERE "id" IN (
  SELECT "id"
  FROM ranked
  WHERE row_num > 1
);

CREATE UNIQUE INDEX "Alert_org_title_unresolved_unique_idx"
  ON "Alert"("organizationId", "title")
  WHERE "resolvedAt" IS NULL;
