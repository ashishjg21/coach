-- AlterTable
ALTER TABLE "Wellness" ADD COLUMN     "abdomen" DOUBLE PRECISION,
ADD COLUMN     "bloodGlucose" DOUBLE PRECISION,
ADD COLUMN     "bodyFat" DOUBLE PRECISION,
ADD COLUMN     "diastolic" INTEGER,
ADD COLUMN     "hydration" TEXT,
ADD COLUMN     "hydrationVolume" DOUBLE PRECISION,
ADD COLUMN     "injury" TEXT,
ADD COLUMN     "lactate" DOUBLE PRECISION,
ADD COLUMN     "menstrualPhase" TEXT,
ADD COLUMN     "respiration" DOUBLE PRECISION,
ADD COLUMN     "skinTemp" DOUBLE PRECISION,
ADD COLUMN     "systolic" INTEGER,
ADD COLUMN     "vo2max" DOUBLE PRECISION;
