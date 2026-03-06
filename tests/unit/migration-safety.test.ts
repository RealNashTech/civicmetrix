import { describe, expect, it } from "vitest";

import { findUnsafeMigrationPatterns } from "../../scripts/check-migrations";

describe("migration safety checks", () => {
  it("flags NOT NULL columns added without defaults", () => {
    const sql = 'ALTER TABLE "IssueReport" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL;';
    const findings = findUnsafeMigrationPatterns(sql);
    expect(findings).toContain("adds NOT NULL column without DEFAULT");
  });

  it("allows expand/backfill/contract migration patterns", () => {
    const sql = `
      ALTER TABLE "IssueReport" ADD COLUMN "updatedAt" TIMESTAMP(3);
      UPDATE "IssueReport" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
      ALTER TABLE "IssueReport" ALTER COLUMN "updatedAt" SET NOT NULL;
    `;
    const findings = findUnsafeMigrationPatterns(sql);
    expect(findings).toHaveLength(0);
  });
});
