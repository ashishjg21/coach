-- CreateTable
CREATE TABLE "ScoreTrendExplanation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "metric" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "analysisData" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreTrendExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoreTrendExplanation_userId_type_period_idx" ON "ScoreTrendExplanation"("userId", "type", "period");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreTrendExplanation_userId_type_period_metric_key" ON "ScoreTrendExplanation"("userId", "type", "period", "metric");

-- AddForeignKey
ALTER TABLE "ScoreTrendExplanation" ADD CONSTRAINT "ScoreTrendExplanation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;