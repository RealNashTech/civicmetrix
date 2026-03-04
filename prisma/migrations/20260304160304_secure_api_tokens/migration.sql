/*
  Warnings:

  - You are about to drop the column `token` on the `ApiToken` table. All the data in the column will be lost.
  - Added the required column `scope` to the `ApiToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokenHash` to the `ApiToken` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ApiToken_organizationId_createdAt_idx";

-- DropIndex
DROP INDEX "ApiToken_token_key";

-- AlterTable
ALTER TABLE "ApiToken" DROP COLUMN "token",
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "scope" TEXT NOT NULL,
ADD COLUMN     "tokenHash" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ApiToken_organizationId_idx" ON "ApiToken"("organizationId");

-- CreateIndex
CREATE INDEX "ApiToken_revokedAt_idx" ON "ApiToken"("revokedAt");
