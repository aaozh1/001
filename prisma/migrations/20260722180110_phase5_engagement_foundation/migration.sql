-- CreateEnum
CREATE TYPE "EngagementType" AS ENUM ('sample_request', 'contact_request', 'quote_request');

-- CreateEnum
CREATE TYPE "EngagementBillingStatus" AS ENUM ('pending', 'billed', 'waived', 'refunded');

-- CreateEnum
CREATE TYPE "CreditTxnType" AS ENUM ('topup', 'debit', 'refund', 'adjustment');

-- CreateTable
CREATE TABLE "EngagementEvent" (
    "id" TEXT NOT NULL,
    "type" "EngagementType" NOT NULL,
    "designerOrgId" TEXT NOT NULL,
    "sellerOrgId" TEXT NOT NULL,
    "specItemId" TEXT,
    "materialId" TEXT,
    "rfqId" TEXT,
    "creditCost" INTEGER NOT NULL DEFAULT 0,
    "billingStatus" "EngagementBillingStatus" NOT NULL DEFAULT 'pending',
    "dedupKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerWallet" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "balanceCredits" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "CreditTxnType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "engagementId" TEXT,
    "invoiceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EngagementEvent_sellerOrgId_type_billingStatus_idx" ON "EngagementEvent"("sellerOrgId", "type", "billingStatus");

-- CreateIndex
CREATE INDEX "EngagementEvent_designerOrgId_idx" ON "EngagementEvent"("designerOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "EngagementEvent_dedupKey_key" ON "EngagementEvent"("dedupKey");

-- CreateIndex
CREATE UNIQUE INDEX "SellerWallet_orgId_key" ON "SellerWallet"("orgId");

-- CreateIndex
CREATE INDEX "CreditTransaction_walletId_createdAt_idx" ON "CreditTransaction"("walletId", "createdAt");

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_designerOrgId_fkey" FOREIGN KEY ("designerOrgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_sellerOrgId_fkey" FOREIGN KEY ("sellerOrgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_specItemId_fkey" FOREIGN KEY ("specItemId") REFERENCES "SpecItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerWallet" ADD CONSTRAINT "SellerWallet_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "SellerWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
