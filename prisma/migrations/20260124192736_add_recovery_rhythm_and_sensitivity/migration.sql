-- AlterTable
ALTER TABLE "TrainingPlan" ADD COLUMN     "recoveryRhythm" INTEGER NOT NULL DEFAULT 4;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "recoverySensitivity" TEXT DEFAULT 'MEDIUM';
