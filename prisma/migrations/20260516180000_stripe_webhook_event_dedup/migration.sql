-- Stripe webhook event-id dedup table. Each Stripe webhook delivery (NEW or
-- LEGACY account) inserts (event.id, account) before processing; a P2002 on
-- the primary key signals a redelivery and we short-circuit with HTTP 200.

CREATE TABLE IF NOT EXISTS "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StripeWebhookEvent_account_receivedAt_idx"
    ON "StripeWebhookEvent"("account", "receivedAt");

CREATE INDEX IF NOT EXISTS "StripeWebhookEvent_type_receivedAt_idx"
    ON "StripeWebhookEvent"("type", "receivedAt");
