-- Enforce one-time use for all promo codes
UPDATE "PromoCode" SET "usageLimit" = 1 WHERE "usageLimit" IS NULL OR "usageLimit" <> 1;

-- Deactivate codes that have already been used
UPDATE "PromoCode" SET "isActive" = false WHERE "usedCount" > 0;

-- Make usageLimit required with default 1
ALTER TABLE "PromoCode" ALTER COLUMN "usageLimit" SET DEFAULT 1;
ALTER TABLE "PromoCode" ALTER COLUMN "usageLimit" SET NOT NULL;
