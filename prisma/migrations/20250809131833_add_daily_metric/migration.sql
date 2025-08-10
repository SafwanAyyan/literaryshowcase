-- CreateTable
CREATE TABLE "DailyMetric" (
    "date" TEXT NOT NULL PRIMARY KEY,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "DailyMetric_createdAt_idx" ON "DailyMetric"("createdAt");
