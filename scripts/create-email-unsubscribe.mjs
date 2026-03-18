import 'dotenv/config';
import 'dotenv/config';
import prisma from '../src/lib/prisma.js';

try {
  // Add missing columns to LoggedReferralSignupDraft
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "LoggedReferralSignupDraft"
    ADD COLUMN IF NOT EXISTS "signedUpUserId" TEXT,
    ADD COLUMN IF NOT EXISTS "matchedAt" TIMESTAMP(3)
  `);
  console.log('✅ LoggedReferralSignupDraft columns added');

  // EmailUnsubscribe table (idempotent)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EmailUnsubscribe" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "email" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EmailUnsubscribe_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "EmailUnsubscribe_email_key" UNIQUE ("email")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "EmailUnsubscribe_email_idx" ON "EmailUnsubscribe"("email")
  `);
  console.log('✅ EmailUnsubscribe table ready');
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await prisma.$disconnect();
}
