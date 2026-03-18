import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const CURATED_VOICE_IDS = [
  "vz3dx89akMq5gofrv9Bi",
  "BpjGufoPiobT79j2vtj4",
  "2t85BBUECtLLKQzxLD95",
  "6fZce9LFNG3iEITDfqZZ",
  "kdmDKE6EkgrWrrykO9Qt",
  "FGY2WhTYpPnrIDTdsKH5",
  "Xb7hH8MSUJpSbSDYk0k2",
  "XrExE9yKIg1WjnnlVkGX",
  "cgSgspJ2msm6clMCkdW9",
  "pFZP5JQG7iQjIQuC4Bku",
  "Hh0rE70WfnSFN80K8uJC",
  "WAhoMTNdLdMoq1j3wf3I",
  "tnSpp4vdxKPjI9w0GnoV",
  "yj30vwTGJxSHezdAGsv9",
  "OYTbf65OHHFELVut7v2H",
];

const LANGUAGES = ["en", "sk", "cs"];

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function checkR2Exists(key) {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }));
    return true;
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw err;
  }
}

async function downloadFromCloudinary(voiceId, lang) {
  const url = `https://res.cloudinary.com/deko7pua9/video/upload/talking-head-audio/voice-previews/${voiceId}_${lang}.mp3`;
  
  const response = await fetch(url, { timeout: 30000 });
  
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToR2(buffer, key) {
  await s3Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: "audio/mpeg",
  }));
  
  return `${R2_PUBLIC_URL}/${key}`;
}

async function migrateVoicePreview(voiceId, lang) {
  const r2Key = `voice-previews/${voiceId}_${lang}.mp3`;
  
  const exists = await checkR2Exists(r2Key);
  if (exists) {
    console.log(`  ⏭️  Already exists: ${voiceId}_${lang}`);
    return { status: "skipped", voiceId, lang };
  }
  
  const buffer = await downloadFromCloudinary(voiceId, lang);
  const r2Url = await uploadToR2(buffer, r2Key);
  
  console.log(`  ✅ Migrated: ${voiceId}_${lang} (${buffer.length} bytes)`);
  return { status: "migrated", voiceId, lang, url: r2Url, size: buffer.length };
}

async function main() {
  console.log("🔊 Voice Previews Migration: Cloudinary → R2");
  console.log("=".repeat(50));
  console.log(`📊 Voices: ${CURATED_VOICE_IDS.length}`);
  console.log(`🌍 Languages: ${LANGUAGES.join(", ")}`);
  console.log(`📁 Total files: ${CURATED_VOICE_IDS.length * LANGUAGES.length}`);
  console.log(`🪣 R2 Bucket: ${R2_BUCKET_NAME}`);
  console.log("=".repeat(50) + "\n");

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error("❌ R2 credentials not configured");
    process.exit(1);
  }

  const results = { migrated: 0, skipped: 0, failed: 0, errors: [] };
  
  for (const voiceId of CURATED_VOICE_IDS) {
    console.log(`\n🎤 Voice: ${voiceId}`);
    
    for (const lang of LANGUAGES) {
      try {
        const result = await migrateVoicePreview(voiceId, lang);
        if (result.status === "migrated") {
          results.migrated++;
        } else {
          results.skipped++;
        }
      } catch (err) {
        console.log(`  ❌ Failed: ${voiceId}_${lang} - ${err.message}`);
        results.failed++;
        results.errors.push({ voiceId, lang, error: err.message });
      }
      
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 MIGRATION COMPLETE");
  console.log("=".repeat(50));
  console.log(`✅ Migrated: ${results.migrated}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log("\n❌ Errors:");
    results.errors.forEach(e => console.log(`  - ${e.voiceId}_${e.lang}: ${e.error}`));
  }
  
  console.log("\n🔗 New URL pattern:");
  console.log(`   ${R2_PUBLIC_URL}/voice-previews/{voiceId}_{lang}.mp3`);
}

main().catch(console.error);
