import fs from "fs";
import path from "path";

const migrationsDir = path.join(process.cwd(), "prisma/migrations");

function checkMigration(filePath: string) {
  const sql = fs.readFileSync(filePath, "utf8");

  const unsafePatterns = [/ADD COLUMN .* NOT NULL/i, /ALTER COLUMN .* SET NOT NULL/i];

  for (const pattern of unsafePatterns) {
    if (pattern.test(sql) && !sql.includes("DEFAULT")) {
      console.error(`Unsafe migration detected in ${filePath}`);
      process.exit(1);
    }
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
