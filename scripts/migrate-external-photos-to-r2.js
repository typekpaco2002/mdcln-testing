/**
 * Migrate External Model Photos to R2
 * 
 * Migrates AI-generated model photos from external URLs (WaveSpeed, Replicate, CloudFront)
 * to Cloudflare R2 for permanent storage.
 * 
 * USAGE:
 *   DRY RUN (see what would be migrated):
 *     node scripts/migrate-external-photos-to-r2.js --dry-run
 * 
 *   EXECUTE (make actual changes):
 *     node scripts/migrate-external-photos-to-r2.js --execute
 * 
 *   PRODUCTION (with production DATABASE_URL):
 *     DATABASE_URL="postgres://..." node scripts/migrate-external-photos-to-r2.js --execute
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs';
import 'dotenv/config';

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--execute');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const RATE_LIMIT_MS = 200;
const FETCH_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
  console.error("❌ R2 environment variables not configured");
  process.exit(1);
}

const prisma = new PrismaClient();
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const auditLog = [];
const AUDIT_FILE = `migration-external-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;

function log(msg, level = 'INFO') {
  console.log(`[${new Date().toISOString()}] [${level}] ${msg}`);
}

function isR2Url(url) {
  return url && (url.includes('r2.dev') || url.includes(R2_PUBLIC_URL));
}

function isExternalUrl(url) {
  if (!url) return false;
  if (isR2Url(url)) return false;
  return url.includes('wavespeed') || 
         url.includes('replicate') || 
         url.includes('cloudfront.net') ||
         url.includes('amazonaws.com') ||
         url.includes('delivery.replicate.dev');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

async function downloadWithRetry(url) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      log(`  📥 Downloading (attempt ${attempt}): ${url.substring(0, 60)}...`);
      const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "image/png";
      
      return { buffer, contentType, size: buffer.length };
    } catch (error) {
      log(`    ⚠️ Attempt ${attempt} failed: ${error.message}`, 'WARN');
      if (attempt < MAX_RETRIES) {
        await sleep(1000 * attempt);
      } else {
        throw error;
      }
    }
  }
}

async function uploadToR2(buffer, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3Client.send(command);
  return `${R2_PUBLIC_URL}/${key}`;
}

function getExtension(contentType, url) {
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('png')) return 'png';
  if (url.includes('.jpg') || url.includes('.jpeg')) return 'jpg';
  if (url.includes('.webp')) return 'webp';
  return 'png';
}

async function migratePhoto(model, field, url) {
  if (!isExternalUrl(url)) {
    if (isR2Url(url)) {
      log(`  ✓ ${field} already on R2`);
    }
    return { skipped: true, newUrl: url };
  }

  try {
    const { buffer, contentType, size } = await downloadWithRetry(url);
    log(`    ✅ Downloaded: ${size} bytes`);
    
    const ext = getExtension(contentType, url);
    const photoNum = field.replace('photo', '').replace('Url', '');
    const r2Key = `models/${model.userId}/${model.id}/photo${photoNum}.${ext}`;
    
    if (DRY_RUN) {
      log(`    [DRY RUN] Would upload to: ${r2Key}`);
      auditLog.push({ modelId: model.id, field, oldUrl: url, status: 'DRY_RUN' });
      return { skipped: false, newUrl: `${R2_PUBLIC_URL}/${r2Key}`, dryRun: true };
    }
    
    const newUrl = await uploadToR2(buffer, r2Key, contentType);
    log(`    ✅ Uploaded: ${r2Key}`);
    auditLog.push({ modelId: model.id, field, oldUrl: url, newUrl, status: 'MIGRATED' });
    
    return { skipped: false, newUrl };
  } catch (error) {
    log(`    ❌ Failed: ${error.message}`, 'ERROR');
    auditLog.push({ modelId: model.id, field, oldUrl: url, status: 'FAILED', error: error.message });
    return { skipped: false, failed: true };
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 EXTERNAL PHOTOS MIGRATION → R2');
  console.log('   (WaveSpeed, Replicate, CloudFront → Cloudflare R2)');
  console.log('='.repeat(70));
  console.log(`\n📋 Mode: ${DRY_RUN ? '🔍 DRY RUN' : '⚡ EXECUTE'}`);
  console.log(`📦 R2 Bucket: ${R2_BUCKET_NAME}\n`);

  const allModels = await prisma.savedModel.findMany({
    select: {
      id: true,
      userId: true,
      name: true,
      photo1Url: true,
      photo2Url: true,
      photo3Url: true,
    }
  });

  log(`📊 Total models: ${allModels.length}`);

  const modelsToMigrate = allModels.filter(m =>
    isExternalUrl(m.photo1Url) ||
    isExternalUrl(m.photo2Url) ||
    isExternalUrl(m.photo3Url)
  );

  log(`📦 Models with external URLs: ${modelsToMigrate.length}`);

  if (modelsToMigrate.length === 0) {
    log('\n✅ No models need migration!');
    await prisma.$disconnect();
    return;
  }

  console.log('\n📋 Models to migrate:');
  modelsToMigrate.forEach((m, i) => {
    const urls = [m.photo1Url, m.photo2Url, m.photo3Url].filter(isExternalUrl);
    console.log(`   ${i + 1}. ${m.name} (${urls.length} external photos)`);
  });

  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < modelsToMigrate.length; i++) {
    const model = modelsToMigrate[i];
    if (i > 0) await sleep(RATE_LIMIT_MS);

    log(`\n📦 [${i + 1}/${modelsToMigrate.length}] ${model.name}`);

    const updates = {};
    let hasError = false;

    for (const field of ['photo1Url', 'photo2Url', 'photo3Url']) {
      const url = model[field];
      if (!url) continue;

      const result = await migratePhoto(model, field, url);
      
      if (result.failed) {
        hasError = true;
      } else if (!result.skipped && !result.dryRun) {
        updates[field] = result.newUrl;
      }
    }

    if (Object.keys(updates).length > 0 && !hasError && !DRY_RUN) {
      await prisma.savedModel.update({
        where: { id: model.id },
        data: updates
      });
      log(`   💾 Database updated`);
      successCount++;
    } else if (hasError) {
      errorCount++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Migrated: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`⏱️  Duration: ${duration}s`);

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - no changes made');
    console.log('   Run with --execute to migrate');
  }

  if (auditLog.length > 0) {
    const csv = ['modelId,field,oldUrl,newUrl,status,error',
      ...auditLog.map(e => 
        `"${e.modelId}","${e.field}","${e.oldUrl || ''}","${e.newUrl || ''}","${e.status}","${e.error || ''}"`
      )
    ].join('\n');
    fs.writeFileSync(AUDIT_FILE, csv);
    log(`📝 Audit log: ${AUDIT_FILE}`);
  }

  await prisma.$disconnect();
  console.log('\n✅ Done!\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
