-- AlterTable
ALTER TABLE "Generation" ADD COLUMN IF NOT EXISTS "pipelinePayload" JSONB;
