-- AlterTable
ALTER TABLE "SpecItem" ADD COLUMN     "installedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SiteLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "specItemId" TEXT,
    "kind" TEXT NOT NULL,
    "note" TEXT,
    "photo" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteLog_projectId_createdAt_idx" ON "SiteLog"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "SiteLog" ADD CONSTRAINT "SiteLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteLog" ADD CONSTRAINT "SiteLog_specItemId_fkey" FOREIGN KEY ("specItemId") REFERENCES "SpecItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteLog" ADD CONSTRAINT "SiteLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

