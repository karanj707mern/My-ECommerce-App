-- AlterTable
ALTER TABLE "new_arrival" ADD COLUMN IF NOT EXISTS "comingSoon" BOOLEAN NOT NULL DEFAULT false;
