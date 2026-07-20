-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT,
    "props" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_event_createdAt_idx" ON "AnalyticsEvent"("event", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_orgId_idx" ON "AnalyticsEvent"("orgId");

