-- AlterTable
ALTER TABLE "ApiToken" ADD COLUMN "tokenPrefix" VARCHAR(8);

-- CreateIndex
CREATE INDEX "ApiToken_tokenPrefix_idx" ON "ApiToken"("tokenPrefix");
