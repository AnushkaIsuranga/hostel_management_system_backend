/*
  Warnings:

  - The `eventData` column on the `InteractionEvent` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "InteractionEvent" DROP COLUMN "eventData",
ADD COLUMN     "eventData" JSONB;
