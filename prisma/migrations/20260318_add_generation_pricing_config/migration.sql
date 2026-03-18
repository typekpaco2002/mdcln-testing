CREATE TABLE "GenerationPricingConfig" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "values" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GenerationPricingConfig_pkey" PRIMARY KEY ("id")
);
