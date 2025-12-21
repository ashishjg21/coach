-- DropForeignKey
ALTER TABLE "public"."FitFile" DROP CONSTRAINT "FitFile_workoutId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FitFile" DROP CONSTRAINT "FitFile_userId_fkey";

-- DropTable
DROP TABLE "public"."FitFile";

