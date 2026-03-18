-- Content reformatter: history of convert-to-format jobs; output in R2, kept ~1 month
CREATE TABLE IF NOT EXISTS "ConverterJob" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "originalFileName" TEXT,
  "outputUrl" TEXT,
  "outputExt" TEXT,
  "status" TEXT NOT NULL DEFAULT 'processing',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),

  CONSTRAINT "ConverterJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ConverterJob_userId_idx" ON "ConverterJob"("userId");
CREATE INDEX IF NOT EXISTS "ConverterJob_userId_createdAt_idx" ON "ConverterJob"("userId", "createdAt");
