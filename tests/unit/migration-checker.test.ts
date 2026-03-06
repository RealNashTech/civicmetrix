import { describe, expect, it } from "vitest";

import { findUnsafeMigrationPatterns } from "../../scripts/check-migrations";

describe("check-migrations", () => {
  it("migration adding NOT NULL column without DEFAULT is flagged", () => {
    const sql = 'ALTER TABLE "IssueReport" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL;';
    const findings = findUnsafeMigrationPatterns(sql);
    expect(findings).toContain("adds NOT NULL column without DEFAULT");
  });

  it("safe migration passes validation", () => {
    const sql = 'ALTER TABLE "IssueReport" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();';
    const findings = findUnsafeMigrationPatterns(sql);
    expect(findings).toHaveLength(0);
  });

  it("expand/backfill/contract migration passes", () => {
    const sql = `
      ALTER TABLE "ApiToken" ADD COLUMN "scope" TEXT;
      UPDATE "ApiToken" SET "scope" = 'legacy:full' WHERE "scope" IS NULL;
      ALTER TABLE "ApiToken" ALTER COLUMN "scope" SET NOT NULL;
    `;
    const findings = findUnsafeMigrationPatterns(sql);
    expect(findings).toHaveLength(0);
  });

  it("SQL without dangerous patterns passes", () => {
    const sql = 'CREATE INDEX "IssueReport_organizationId_idx" ON "IssueReport"("organizationId");';
    const findings = findUnsafeMigrationPatterns(sql);
    expect(findings).toHaveLength(0);
  });
});
