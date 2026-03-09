import fs from "fs";
import path from "path";

const migrationsDir = path.join(process.cwd(), "prisma/migrations");
const MIGRATION_SAFETY_START = "2026-03-09";

export function findUnsafeMigrationPatterns(sql: string) {
  const findings: string[] = [];
  const patterns: Array<{ regex: RegExp; label: string }> = [
    {
      regex: /\bDROP\s+TABLE\b/gi,
      label: "DROP TABLE",
    },
    {
      regex: /\bDROP\s+COLUMN\b/gi,
      label: "DROP COLUMN",
    },
    {
      regex: /\bALTER\s+COLUMN\b[\s\S]*?\bTYPE\b/gi,
      label: "ALTER COLUMN TYPE",
    },
    {
      regex: /\bALTER\s+TABLE\b[\s\S]*?\bRENAME\b/gi,
      label: "ALTER TABLE ... RENAME",
    },
    {
      regex: /\bDELETE\s+FROM\b/gi,
      label: "DELETE FROM",
    },
  ];

  for (const { regex, label } of patterns) {
    if (regex.test(sql)) {
      findings.push(label);
    }
  }

  return findings;
}

function checkMigration(filePath: string) {
  const sql = fs.readFileSync(filePath, "utf8");
  const findings = findUnsafeMigrationPatterns(sql);
  const reviewedOverride = /--\s*migration-safety:\s*reviewed\b/i.test(sql);

  if (findings.length > 0 && reviewedOverride) {
    console.log(`[migration-safety] reviewed migration allowed: ${filePath}`);
    return;
  }

  if (findings.length > 0) {
    console.error(`[migration-safety] Unsafe migration detected in ${filePath}`);
    console.error(`[migration-safety] risky operations: ${findings.join(", ")}`);
    process.exit(1);
  }
}

function getMigrationDateFromDirName(dirName: string): string | null {
  const match = dirName.match(/^(\d{14})_/);
  if (!match) {
    return null;
  }

  const timestamp = match[1];
  const year = timestamp.slice(0, 4);
  const month = timestamp.slice(4, 6);
  const day = timestamp.slice(6, 8);

  return `${year}-${month}-${day}`;
}

function run() {
  const dirs = fs.readdirSync(migrationsDir);

  for (const dir of dirs) {
    const migrationFile = path.join(migrationsDir, dir, "migration.sql");

    if (fs.existsSync(migrationFile)) {
      const migrationDate = getMigrationDateFromDirName(dir);
      if (!migrationDate || migrationDate < MIGRATION_SAFETY_START) {
        console.log(`[migration-safety] skipping legacy migration: ${dir}`);
        continue;
      }

      checkMigration(migrationFile);
    }
  }

  console.log("[migration-safety] check passed");
}

run();
