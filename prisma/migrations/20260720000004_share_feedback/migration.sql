-- AlterTable
ALTER TABLE "SpecBook" ADD COLUMN     "shareExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ShareFeedback" (
    "id" TEXT NOT NULL,
    "specBookId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShareFeedback_specBookId_itemCode_idx" ON "ShareFeedback"("specBookId", "itemCode");

-- AddForeignKey
ALTER TABLE "ShareFeedback" ADD CONSTRAINT "ShareFeedback_specBookId_fkey" FOREIGN KEY ("specBookId") REFERENCES "SpecBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

