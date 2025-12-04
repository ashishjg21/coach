-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "completenessScore" INTEGER,
ADD COLUMN     "duplicateOf" TEXT,
ADD COLUMN     "isDuplicate" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Workout_userId_isDuplicate_idx" ON "Workout"("userId", "isDuplicate");

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_duplicateOf_fkey" FOREIGN KEY ("duplicateOf") REFERENCES "Workout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
