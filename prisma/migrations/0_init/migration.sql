-- Initial migration - baseline schema
-- This satisfies Replit's migration validator
-- Actual schema sync happens via `prisma db push` on startup

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationCode" TEXT,
    "codeExpiresAt" TIMESTAMP(3),
    "subscriptionTier" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial',
    "subscriptionBillingCycle" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "maxModels" INTEGER NOT NULL DEFAULT 5,
    "subscriptionCredits" INTEGER NOT NULL DEFAULT 25,
    "purchasedCredits" INTEGER NOT NULL DEFAULT 0,
    "creditsExpireAt" TIMESTAMP(3),
    "credits" INTEGER NOT NULL DEFAULT 319,
    "totalCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "imageCredits" INTEGER NOT NULL DEFAULT 0,
    "videoCredits" INTEGER NOT NULL DEFAULT 0,
    "imagesUsed" INTEGER NOT NULL DEFAULT 0,
    "videosUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "paymentSessionId" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Generation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "duration" INTEGER,
    "resolution" TEXT,
    "creditsCost" INTEGER NOT NULL,
    "actualCostUSD" DOUBLE PRECISION,
    "inputImageUrl" TEXT,
    "inputVideoUrl" TEXT,
    "outputUrl" TEXT,
    "replicateModel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SavedModel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photo1Url" TEXT NOT NULL,
    "photo2Url" TEXT NOT NULL,
    "photo3Url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SignupFingerprint" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "deviceFingerprint" TEXT NOT NULL,
    "userAgent" TEXT,
    "email" TEXT,
    "freeCreditsGiven" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignupFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CreditTransaction_paymentSessionId_key" ON "CreditTransaction"("paymentSessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CreditTransaction_userId_idx" ON "CreditTransaction"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CreditTransaction_paymentSessionId_idx" ON "CreditTransaction"("paymentSessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Generation_userId_idx" ON "Generation"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Generation_status_idx" ON "Generation"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SavedModel_userId_idx" ON "SavedModel"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SignupFingerprint_ipAddress_idx" ON "SignupFingerprint"("ipAddress");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SignupFingerprint_deviceFingerprint_idx" ON "SignupFingerprint"("deviceFingerprint");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SignupFingerprint_ipAddress_deviceFingerprint_idx" ON "SignupFingerprint"("ipAddress", "deviceFingerprint");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CreditTransaction_userId_fkey') THEN
        ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Generation_userId_fkey') THEN
        ALTER TABLE "Generation" ADD CONSTRAINT "Generation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SavedModel_userId_fkey') THEN
        ALTER TABLE "SavedModel" ADD CONSTRAINT "SavedModel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
