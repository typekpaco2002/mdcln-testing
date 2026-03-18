-- Add message and errorMessage to RepurposeJob (in case only progress was added earlier).
-- Safe: ADD COLUMN IF NOT EXISTS does not touch existing data.
ALTER TABLE "RepurposeJob" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "RepurposeJob" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
