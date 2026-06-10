/*
  Warnings:

  - Added the required column `classificationConfidence` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "classificationAlternatives" "TicketChannel"[],
ADD COLUMN     "classificationConfidence" DOUBLE PRECISION NOT NULL;
