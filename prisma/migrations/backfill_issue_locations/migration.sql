UPDATE "IssueReport"
SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)
WHERE "location" IS NULL
  AND "latitude" IS NOT NULL
  AND "longitude" IS NOT NULL;

CREATE OR REPLACE FUNCTION set_issue_location()
RETURNS trigger AS $$
BEGIN
  IF NEW."longitude" IS NULL OR NEW."latitude" IS NULL THEN
    NEW."location" := NULL;
  ELSE
    NEW."location" := ST_SetSRID(ST_MakePoint(NEW."longitude", NEW."latitude"), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS issue_location_trigger ON "IssueReport";

CREATE TRIGGER issue_location_trigger
BEFORE INSERT OR UPDATE ON "IssueReport"
FOR EACH ROW
EXECUTE FUNCTION set_issue_location();
