-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN IF NOT EXISTS "centerAvailableAt" TIMESTAMP(3);
ALTER TABLE "Chapter" ADD COLUMN IF NOT EXISTS "onlineAvailableAt" TIMESTAMP(3);
