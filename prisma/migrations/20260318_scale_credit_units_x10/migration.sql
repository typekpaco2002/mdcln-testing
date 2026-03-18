-- Scale credit unit system by 10x.
-- This migration is intentionally one-way.

-- 1) Multiply existing user balances by 10 (as requested)
UPDATE "User"
SET
  "subscriptionCredits" = COALESCE("subscriptionCredits", 0) * 10,
  "purchasedCredits"    = COALESCE("purchasedCredits", 0) * 10,
  "credits"             = COALESCE("credits", 0) * 10;

-- 2) Ensure no free credits for newly created users
ALTER TABLE "User"
  ALTER COLUMN "subscriptionCredits" SET DEFAULT 0;

ALTER TABLE "User"
  ALTER COLUMN "credits" SET DEFAULT 0;
