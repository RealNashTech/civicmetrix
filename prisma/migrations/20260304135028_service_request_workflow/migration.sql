/*
  Warnings:

  - Added the required column `updatedAt` to the `IssueReport` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "IssueReport" ADD COLUMN     "assignedDepartmentId" TEXT,
ADD COLUMN     "assignedUserId" TEXT,
ADD COLUMN     "priority" "IssuePriority",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "IssueReport_assignedDepartmentId_idx" ON "IssueReport"("assignedDepartmentId");

-- CreateIndex
CREATE INDEX "IssueReport_priority_idx" ON "IssueReport"("priority");

-- AddForeignKey
ALTER TABLE "IssueReport" ADD CONSTRAINT "IssueReport_assignedDepartmentId_fkey" FOREIGN KEY ("assignedDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
