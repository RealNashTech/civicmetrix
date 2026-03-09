ALTER TABLE "AssistanceRecord"
ADD COLUMN "latitude" DOUBLE PRECISION;

ALTER TABLE "AssistanceRecord"
ADD COLUMN "longitude" DOUBLE PRECISION;

ALTER TABLE "AssistanceRecord"
ADD COLUMN "city" TEXT;

ALTER TABLE "AssistanceRecord"
ADD COLUMN "zipcode" TEXT;
