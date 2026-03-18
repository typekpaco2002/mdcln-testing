-- Run this on your production DB if migrations were not applied (e.g. 500 on prompt-image / pipeline).
-- Safe to run multiple times (idempotent).
--
-- Log-based fixes (2026-03-15):
-- - Create-from-photos: server was using callback and never got outputUrl → use forcePolling (code fix).
-- - LoraTrainingImage.create "Argument model is missing" → pass modelId in register-training-images (code fix).
-- - SavedModel.create "photo1Url is missing" → was undefined due to callback flow; forcePolling fixes it.

-- 0. User.proAccess (Pro Studio invite-only access)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "proAccess" BOOLEAN NOT NULL DEFAULT false;

-- 1. Generation.pipelinePayload (required for image->video pipeline callbacks)
ALTER TABLE "Generation" ADD COLUMN IF NOT EXISTS "pipelinePayload" JSONB;

-- 2. RepurposeJob columns (if you use video repurpose)
ALTER TABLE "RepurposeJob" ADD COLUMN IF NOT EXISTS "progress" INTEGER;
ALTER TABLE "RepurposeJob" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "RepurposeJob" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
