-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "senderSide" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Quote_rfqId_sellerOrgId_key" ON "Quote"("rfqId", "sellerOrgId");

