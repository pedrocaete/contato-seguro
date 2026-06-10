-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "channel" DROP NOT NULL,
ALTER COLUMN "priority" DROP NOT NULL,
ALTER COLUMN "classificationConfidence" DROP NOT NULL;
