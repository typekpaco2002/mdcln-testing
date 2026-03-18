#!/usr/bin/env node
/**
 * One-off: renames CryptoPayment.oderId → orderId in the DB so prisma db push succeeds.
 * Run before `npx prisma db push` in production. Safe to run multiple times (no-op if already orderId).
 * Usage: node scripts/rename-crypto-oderId-to-orderId.js
 */
import 'dotenv/config';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.warn('DATABASE_URL not set, skipping rename');
    process.exit(0);
  }
  const prismaPath = join(__dirname, '..', 'src', 'lib', 'prisma.js');
  const { default: prisma } = await import(pathToFileURL(prismaPath).href);
  try {
    const sql = `
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'CryptoPayment' AND column_name = 'oderId'
        ) THEN
          ALTER TABLE "CryptoPayment" RENAME COLUMN "oderId" TO "orderId";
          RAISE NOTICE 'Renamed CryptoPayment.oderId to orderId';
        END IF;
      END $$;
    `;
    await prisma.$executeRawUnsafe(sql);
    console.log('✅ CryptoPayment column rename completed (or already orderId)');
  } catch (err) {
    console.warn('⚠️ Rename skip:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
