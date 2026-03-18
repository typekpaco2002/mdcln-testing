-- Run this in Neon SQL Editor.
-- If RepurposeJob table doesn't exist, creates it and RepurposeOutput. Otherwise adds missing columns only.
-- Safe: CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS. No data loss.

-- 1. Create RepurposeJob table if missing
CREATE TABLE IF NOT EXISTS "RepurposeJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "progress" INTEGER,
    "message" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepurposeJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RepurposeJob_userId_idx" ON "RepurposeJob"("userId");
CREATE INDEX IF NOT EXISTS "RepurposeJob_userId_createdAt_idx" ON "RepurposeJob"("userId", "createdAt");

-- 2. Create RepurposeOutput table if missing
CREATE TABLE IF NOT EXISTS "RepurposeOutput" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepurposeOutput_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RepurposeOutput_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "RepurposeJob"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "RepurposeOutput_jobId_idx" ON "RepurposeOutput"("jobId");

-- 3. If tables already existed, add any missing columns
ALTER TABLE "RepurposeJob" ADD COLUMN IF NOT EXISTS "progress" INTEGER;
ALTER TABLE "RepurposeJob" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "RepurposeJob" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
