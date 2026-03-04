CREATE EXTENSION IF NOT EXISTS postgis;

-- AlterTable
ALTER TABLE "IssueReport" ADD COLUMN     "location" geometry(Point,4326);

CREATE INDEX issue_location_idx ON "IssueReport" USING GIST (location);
