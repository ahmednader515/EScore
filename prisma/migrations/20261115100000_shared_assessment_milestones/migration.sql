ALTER TABLE "Quiz"
ADD COLUMN "isGlobalShared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sharedUnitPosition" INTEGER,
ADD COLUMN "sharedAfterPosition" INTEGER;

ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_shared_milestone_check" CHECK (
  (NOT "isGlobalShared" AND "sharedUnitPosition" IS NULL AND "sharedAfterPosition" IS NULL)
  OR ("isGlobalShared" AND "unitId" IS NULL AND "sharedUnitPosition" >= 1
      AND "sharedUnitPosition" IS NOT NULL AND "sharedAfterPosition" >= 0
      AND "sharedAfterPosition" IS NOT NULL)
);
