/*
  Warnings:

  - You are about to drop the column `workoutId` on the `PlannedWorkout` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PlannedWorkout" DROP COLUMN "workoutId";

-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "plannedWorkoutId" TEXT;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "PlannedWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
