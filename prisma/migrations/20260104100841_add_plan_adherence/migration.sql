-- CreateTable
CREATE TABLE "PlanAdherence" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "plannedWorkoutId" TEXT NOT NULL,
    "overallScore" INTEGER,
    "intensityScore" INTEGER,
    "durationScore" INTEGER,
    "executionScore" INTEGER,
    "summary" TEXT,
    "deviations" JSONB,
    "recommendations" JSONB,
    "analysisStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "analyzedAt" TIMESTAMP(3),
    "modelVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanAdherence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanAdherence_workoutId_key" ON "PlanAdherence"("workoutId");

-- CreateIndex
CREATE INDEX "PlanAdherence_workoutId_idx" ON "PlanAdherence"("workoutId");

-- CreateIndex
CREATE INDEX "PlanAdherence_plannedWorkoutId_idx" ON "PlanAdherence"("plannedWorkoutId");

-- AddForeignKey
ALTER TABLE "PlanAdherence" ADD CONSTRAINT "PlanAdherence_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAdherence" ADD CONSTRAINT "PlanAdherence_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "PlannedWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
