-- AlterTable
ALTER TABLE "Grant" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "KPI" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;
