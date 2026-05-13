-- Integrator completion webhooks (async pipeline integration)
ALTER TABLE "Generation" ADD COLUMN IF NOT EXISTS "integratorWebhookUrl" TEXT;
ALTER TABLE "Generation" ADD COLUMN IF NOT EXISTS "integratorWebhookSecret" TEXT;
ALTER TABLE "Generation" ADD COLUMN IF NOT EXISTS "integratorWebhookDeliveredAt" TIMESTAMP(3);
