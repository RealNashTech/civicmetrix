-- CreateTable
CREATE TABLE "RbacRole" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RbacRole_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

-- CreateIndex
CREATE INDEX "RbacRole_organizationId_idx" ON "RbacRole"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RbacRole_organizationId_name_key" ON "RbacRole"("organizationId", "name");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- AddForeignKey
ALTER TABLE "RbacRole" ADD CONSTRAINT "RbacRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RbacRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
