DROP INDEX IF EXISTS "Citizen_email_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Citizen_organizationId_email_key"
ON "Citizen" ("organizationId", "email");
