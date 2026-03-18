-- Add missing progress column to RepurposeJob (0-100 for serverless polling).
-- Safe: ADD COLUMN IF NOT EXISTS does not touch existing data.
ALTER TABLE "RepurposeJob" ADD COLUMN IF NOT EXISTS "progress" INTEGER;
