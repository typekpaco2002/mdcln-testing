-- CreateTable: loggedRefferalSignupDrafts
CREATE TABLE IF NOT EXISTS "loggedRefferalSignupDrafts" (
  "id" TEXT NOT NULL,
  "referralCode" TEXT NOT NULL,
  "referrerUserId" TEXT NOT NULL,
  "ipAddress" TEXT,
  "deviceFingerprint" TEXT,
  "userAgent" TEXT,
  "signup" BOOLEAN NOT NULL DEFAULT false,
  "signedUpUserId" TEXT,
  "matchedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loggedRefferalSignupDrafts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "loggedRefferalSignupDrafts_signup_createdAt_idx"
  ON "loggedRefferalSignupDrafts"("signup", "createdAt");
CREATE INDEX IF NOT EXISTS "loggedRefferalSignupDrafts_ipAddress_signup_createdAt_idx"
  ON "loggedRefferalSignupDrafts"("ipAddress", "signup", "createdAt");
CREATE INDEX IF NOT EXISTS "loggedRefferalSignupDrafts_deviceFingerprint_signup_createdAt_idx"
  ON "loggedRefferalSignupDrafts"("deviceFingerprint", "signup", "createdAt");
CREATE INDEX IF NOT EXISTS "loggedRefferalSignupDrafts_referrerUserId_createdAt_idx"
  ON "loggedRefferalSignupDrafts"("referrerUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "loggedRefferalSignupDrafts_signedUpUserId_createdAt_idx"
  ON "loggedRefferalSignupDrafts"("signedUpUserId", "createdAt");
