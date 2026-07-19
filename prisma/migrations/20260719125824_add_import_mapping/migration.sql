-- CreateTable
CREATE TABLE "ImportMapping" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportMapping_orgId_idx" ON "ImportMapping"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportMapping_orgId_fingerprint_key" ON "ImportMapping"("orgId", "fingerprint");

-- AddForeignKey
ALTER TABLE "ImportMapping" ADD CONSTRAINT "ImportMapping_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
