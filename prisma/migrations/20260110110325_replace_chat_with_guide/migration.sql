/*
  Warnings:

  - You are about to drop the column `chatContext` on the `Recommendation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Recommendation" DROP COLUMN "chatContext",
ADD COLUMN     "implementationGuide" JSONB;
