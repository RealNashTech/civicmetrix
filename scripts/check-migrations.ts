import fs from "fs";
import path from "path";

const migrationsDir = path.join(process.cwd(), "prisma/migrations");

export function findUnsafeMigrationPatterns(sql: string) {
  const findings: string[] = [];
  const addColumnNotNullNoDefaultPattern =
    /ADD COLUMN\s+"?[A-Za-z0-9_]+"?\s+[^,;]*NOT NULL(?![^,;]*DEFAULT)/gi;

  if (addColumnNotNullNoDefaultPattern.test(sql)) {
    findings.push("adds NOT NULL column without DEFAULT");
  }

  return findings;
}

function checkMigration(filePath: string) {
  const sql = fs.readFileSync(filePath, "utf8");
  const findings = findUnsafeMigrationPatterns(sql);
  if (findings.length > 0) {
    console.error(`Unsafe migration detected in ${filePath}: ${findings.join(", ")}`);
    process.exit(1);
  }
}

function run() {
  const dirs = fs.readdirSync(migrationsDir);

  for (const dir of dirs) {
    const migrationFile = path.join(migrationsDir, dir, "migration.sql");

    if (fs.existsSync(migrationFile)) {
      checkMigration(migrationFile);
    }
  }

  console.log("Migration safety check passed");
}

run();
