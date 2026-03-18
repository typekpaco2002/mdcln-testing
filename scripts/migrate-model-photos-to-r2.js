/**
 * PRODUCTION-SAFE Model Photo Migration Script (v2 - Enhanced)
 * 
 * Migrates user model photos from Cloudinary to Cloudflare R2.
 * 
 * USAGE:
 *   DRY RUN (no changes):
 *     node scripts/migrate-model-photos-to-r2.js --dry-run
 * 
 *   EXECUTE (with changes):
 *     node scripts/migrate-model-photos-to-r2.js --execute
 * 
 *   PRODUCTION (with production DATABASE_URL):
 *     DATABASE_URL="postgres://..." node scripts/migrate-model-photos-to-r2.js --execute
 * 
 *   SINGLE MODEL TEST:
 *     node scripts/migrate-model-photos-to-r2.js --execute --model-id=abc123
 * 
 * SAFETY FEATURES (v2):
 *   - Dry-run mode by default (use --execute to actually make changes)
 *   - Per-user/per-model folder structure prevents photo mixing
 *   - Idempotent: skips photos already on R2
 *   - CSV audit log for every operation
 *   - Validates download success before updating DB
 *   - Rate limiting (100ms between models)
 *   - Retry logic (3 attempts with exponential backoff)
 *   - Fetch timeout (30 seconds)
 *   - Progress indicator
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs';
import 'dotenv/config';

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--execute');
const SINGLE_MODEL_ID = args.find(a => a.startsWith('--model-id='))?.split('=')[1];

// Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Safety settings
const RATE_LIMIT_MS = 100;        // 100ms delay between models
const FETCH_TIMEOUT_MS = 30000;   // 30 second timeout for downloads
const MAX_RETRIES = 3;            // 3 retry attempts
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second initial retry delay

// Validate R2 configuration
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
  console.error("❌ R2 environment variables not configured");
  console.error("Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL");
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

// Audit log
const auditLog = [];
const AUDIT_FILE = `migration-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function addAuditEntry(entry) {
  auditLog.push({
    timestamp: new Date().toISOString(),
    ...entry
  });
}

function saveAuditLog() {
  if (auditLog.length === 0) return;
  
  const headers = ['timestamp', 'modelId', 'userId', 'modelName', 'photoField', 'oldUrl', 'newUrl', 'status', 'error', 'retries'];
  const csv = [
    headers.join(','),
    ...auditLog.map(entry => 
      headers.map(h => `"${(entry[h] || '').toString().replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n');
  
  fs.writeFileSync(AUDIT_FILE, csv);
  log(`📝 Audit log saved to: ${AUDIT_FILE}`);
}

function isCloudinaryUrl(url) {
  return url && url.includes('cloudinary.com');
}

function isR2Url(url) {
  return url && (url.includes('r2.dev') || url.includes('r2.cloudflarestorage.com'));
}

/**
 * Sleep helper for rate limiting and retry backoff
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout
 */
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
      throw new Error(`Download timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Download file with retry logic
 */
async function downloadFileWithRetry(url, maxRetries = MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`  📥 Downloading (attempt ${attempt}/${maxRetries}): ${url.substring(0, 60)}...`);
      
      const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const checksum = crypto.createHash('md5').update(buffer).digest('hex');
      
      return { 
        buffer, 
        contentType, 
        checksum, 
        size: buffer.length,
        attempts: attempt 
      };
      
    } catch (error) {
      lastError = error;
      log(`    ⚠️ Attempt ${attempt} failed: ${error.message}`, 'WARN');
      
      if (attempt < maxRetries) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
        log(`    ⏳ Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Upload to R2 with retry logic
 */
async function uploadToR2WithRetry(buffer, key, contentType, maxRetries = MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await s3Client.send(command);
      return `${R2_PUBLIC_URL}/${key}`;
      
    } catch (error) {
      lastError = error;
      log(`    ⚠️ Upload attempt ${attempt} failed: ${error.message}`, 'WARN');
      
      if (attempt < maxRetries) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        log(`    ⏳ Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }
  
  throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError.message}`);
}

function getExtensionFromContentType(contentType) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
}

/**
 * Migrate a single photo
 * R2 path structure: user-assets/{userId}/models/{modelId}/photo{n}.{ext}
 */
async function migratePhoto(model, photoField, oldUrl) {
  const photoNumber = photoField.replace('photo', '').replace('Url', '');
  
  // Skip if not Cloudinary
  if (!isCloudinaryUrl(oldUrl)) {
    if (isR2Url(oldUrl)) {
      log(`  ✓ ${photoField} already on R2, skipping`);
      addAuditEntry({
        modelId: model.id,
        userId: model.userId,
        modelName: model.name,
        photoField,
        oldUrl,
        newUrl: oldUrl,
        status: 'SKIPPED_ALREADY_R2',
        retries: 0
      });
    }
    return { success: true, skipped: true, newUrl: oldUrl };
  }
  
  try {
    // Download from Cloudinary with retry
    const { buffer, contentType, checksum, size, attempts } = await downloadFileWithRetry(oldUrl);
    log(`    ✅ Downloaded: ${size} bytes, MD5: ${checksum}${attempts > 1 ? ` (after ${attempts} attempts)` : ''}`);
    
    // Determine extension
    const ext = getExtensionFromContentType(contentType);
    
    // Create safe R2 key: user-assets/{userId}/models/{modelId}/photo{n}.{ext}
    const r2Key = `user-assets/${model.userId}/models/${model.id}/photo${photoNumber}.${ext}`;
    
    if (DRY_RUN) {
      log(`    [DRY RUN] Would upload to: ${r2Key}`);
      const mockNewUrl = `${R2_PUBLIC_URL}/${r2Key}`;
      addAuditEntry({
        modelId: model.id,
        userId: model.userId,
        modelName: model.name,
        photoField,
        oldUrl,
        newUrl: mockNewUrl,
        status: 'DRY_RUN_SUCCESS',
        retries: attempts - 1
      });
      return { success: true, skipped: false, newUrl: mockNewUrl, dryRun: true };
    }
    
    // Upload to R2 with retry
    const newUrl = await uploadToR2WithRetry(buffer, r2Key, contentType);
    log(`    ✅ Uploaded to R2: ${r2Key}`);
    
    addAuditEntry({
      modelId: model.id,
      userId: model.userId,
      modelName: model.name,
      photoField,
      oldUrl,
      newUrl,
      status: 'MIGRATED',
      retries: attempts - 1
    });
    
    return { success: true, skipped: false, newUrl };
    
  } catch (error) {
    log(`    ❌ Failed: ${error.message}`, 'ERROR');
    addAuditEntry({
      modelId: model.id,
      userId: model.userId,
      modelName: model.name,
      photoField,
      oldUrl,
      newUrl: null,
      status: 'FAILED',
      error: error.message,
      retries: MAX_RETRIES
    });
    return { success: false, error: error.message };
  }
}

async function migrateModel(model, index, total) {
  log(`\n📦 [${index + 1}/${total}] Migrating model: ${model.name} (ID: ${model.id})`);
  log(`   User ID: ${model.userId}`);
  
  const updates = {};
  let hasChanges = false;
  let hasErrors = false;
  
  for (const field of ['photo1Url', 'photo2Url', 'photo3Url']) {
    const oldUrl = model[field];
    if (!oldUrl) continue;
    
    const result = await migratePhoto(model, field, oldUrl);
    
    if (!result.success) {
      hasErrors = true;
    } else if (!result.skipped && !result.dryRun) {
      updates[field] = result.newUrl;
      hasChanges = true;
    }
  }
  
  // Update database if we have changes and no errors
  if (hasChanges && !hasErrors && !DRY_RUN) {
    log(`   💾 Updating database with new URLs...`);
    await prisma.savedModel.update({
      where: { id: model.id },
      data: updates
    });
    log(`   ✅ Database updated successfully`);
  } else if (DRY_RUN && Object.keys(updates).length > 0) {
    log(`   [DRY RUN] Would update ${Object.keys(updates).length} photo URLs in database`);
  }
  
  return { hasChanges, hasErrors };
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 MODEL PHOTO MIGRATION: Cloudinary → Cloudflare R2 (v2)');
  console.log('='.repeat(70));
  console.log(`\n📋 Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '⚡ EXECUTE (changes WILL be made)'}`);
  console.log(`📦 R2 Bucket: ${R2_BUCKET_NAME}`);
  console.log(`🌐 R2 Public URL: ${R2_PUBLIC_URL}`);
  console.log(`⚙️  Settings: Rate limit ${RATE_LIMIT_MS}ms, Timeout ${FETCH_TIMEOUT_MS}ms, Max retries ${MAX_RETRIES}`);
  
  if (SINGLE_MODEL_ID) {
    console.log(`🎯 Single model: ${SINGLE_MODEL_ID}`);
  }
  
  console.log('\n');
  
  // Get models to migrate
  const whereClause = SINGLE_MODEL_ID ? { id: SINGLE_MODEL_ID } : {};
  
  const allModels = await prisma.savedModel.findMany({
    where: whereClause,
    select: {
      id: true,
      userId: true,
      name: true,
      photo1Url: true,
      photo2Url: true,
      photo3Url: true
    }
  });
  
  log(`📊 Total models found: ${allModels.length}`);
  
  // Filter to only those with Cloudinary URLs
  const modelsToMigrate = allModels.filter(m => 
    isCloudinaryUrl(m.photo1Url) || 
    isCloudinaryUrl(m.photo2Url) || 
    isCloudinaryUrl(m.photo3Url)
  );
  
  log(`📦 Models with Cloudinary URLs: ${modelsToMigrate.length}`);
  
  if (modelsToMigrate.length === 0) {
    log('\n✅ No models need migration!');
    await prisma.$disconnect();
    return;
  }
  
  // Show what we're about to do
  log('\n📋 Models to migrate:');
  modelsToMigrate.forEach((m, i) => {
    log(`   ${i + 1}. ${m.name} (ID: ${m.id}, User: ${m.userId})`);
  });
  
  // Migrate each model with rate limiting
  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < modelsToMigrate.length; i++) {
    const model = modelsToMigrate[i];
    
    // Rate limiting - add delay between models (except for first one)
    if (i > 0) {
      await sleep(RATE_LIMIT_MS);
    }
    
    const result = await migrateModel(model, i, modelsToMigrate.length);
    if (result.hasErrors) {
      errorCount++;
    } else if (result.hasChanges) {
      successCount++;
    }
  }
  
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Successfully migrated: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`⏭️  Skipped (already R2): ${modelsToMigrate.length - successCount - errorCount}`);
  console.log(`⏱️  Duration: ${durationSec} seconds`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. No actual changes were made.');
    console.log('   To execute the migration, run with --execute flag:');
    console.log('   node scripts/migrate-model-photos-to-r2.js --execute');
  }
  
  // Save audit log
  saveAuditLog();
  
  await prisma.$disconnect();
  console.log('\n✅ Migration complete!\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  saveAuditLog();
  process.exit(1);
});
