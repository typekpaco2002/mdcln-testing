import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import 'dotenv/config';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
  console.error("❌ R2 environment variables not configured");
  process.exit(1);
}

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const GALLERY_ASSETS = [
  { name: "ashleyBeachBikini", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/ashleyBeachBikini" },
  { name: "ashleyBeachSunset", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/ashleyBeachSunset" },
  { name: "ashleyBeachWalk", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/ashleyBeachWalk" },
  { name: "ashleyCafe", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/ashleyCafe" },
  { name: "ashleyCity", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/ashleyCity" },
  { name: "ashleyFitness", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/ashleyFitness" },
  { name: "ashleyGlamDress", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/ashleyGlamDress" },
  { name: "ashleyPinkHair", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/ashleyPinkHair" },
  { name: "ashleyRooftop", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/ashleyRooftop" },
  { name: "lauraBeach1", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/lauraBeach1" },
  { name: "lauraBeach2", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/lauraBeach2" },
  { name: "lauraBeach3", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/lauraBeach3" },
  { name: "lauraBed", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/lauraBed" },
  { name: "lauraBedNight", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/lauraBedNight" },
  { name: "lauraCafe", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/lauraCafe" },
  { name: "lauraHome", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/lauraHome" },
  { name: "lauraLibrary", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/lauraLibrary" },
  { name: "lauraPool", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/lauraPool" },
  { name: "natashaCar1", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/natashaCar1" },
  { name: "natashaCar2", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/natashaCar2" },
  { name: "natashaMirror", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/natashaMirror" },
  { name: "natashaPark", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/natashaPark" },
  { name: "natashaStreet", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/natashaStreet" },
  { name: "natashaYoga1", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/natashaYoga1" },
  { name: "natashaYoga2", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/natashaYoga2" },
  { name: "natashaYoga3", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/natashaYoga3" },
  { name: "natashaYoga4", url: "https://res.cloudinary.com/deko7pua9/image/upload/f_auto,q_auto,w_720/v1/modelclone/gallery/natashaYoga4" },
];

const VIDEO_ASSET = {
  name: "AI_model_main_video",
  url: "https://res.cloudinary.com/deko7pua9/video/upload/v1767047898/AI_model_main_video_pgvyy7.mp4"
};

async function downloadFile(url) {
  console.log(`📥 Downloading: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "application/octet-stream"
  };
}

async function uploadToR2(buffer, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  const publicUrl = `${R2_PUBLIC_URL}/${key}`;
  console.log(`✅ Uploaded: ${publicUrl}`);
  return publicUrl;
}

async function migrateAsset(name, sourceUrl, folder = "gallery") {
  try {
    const { buffer, contentType } = await downloadFile(sourceUrl);
    
    let extension = "jpg";
    if (contentType.includes("video")) {
      extension = "mp4";
    } else if (contentType.includes("png")) {
      extension = "png";
    } else if (contentType.includes("webp")) {
      extension = "webp";
    }
    
    const key = `${folder}/${name}.${extension}`;
    const r2Url = await uploadToR2(buffer, key, contentType);
    
    return { name, oldUrl: sourceUrl, newUrl: r2Url, success: true };
  } catch (error) {
    console.error(`❌ Failed to migrate ${name}: ${error.message}`);
    return { name, oldUrl: sourceUrl, newUrl: null, success: false, error: error.message };
  }
}

async function main() {
  console.log("🚀 Starting Gallery Migration to R2...\n");
  console.log(`📦 R2 Bucket: ${R2_BUCKET_NAME}`);
  console.log(`🌐 Public URL: ${R2_PUBLIC_URL}\n`);
  
  const results = [];
  
  console.log("📸 Migrating images...\n");
  for (const asset of GALLERY_ASSETS) {
    const result = await migrateAsset(asset.name, asset.url);
    results.push(result);
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log("\n🎬 Migrating video...\n");
  const videoResult = await migrateAsset(VIDEO_ASSET.name, VIDEO_ASSET.url);
  results.push(videoResult);
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 MIGRATION SUMMARY");
  console.log("=".repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log("\n❌ FAILED ASSETS:");
    failed.forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  }
  
  console.log("\n📝 URL MAPPING (for updating code):\n");
  console.log("const GALLERY_URLS = {");
  successful.forEach(r => {
    console.log(`  ${r.name}: '${r.newUrl}',`);
  });
  console.log("};");
  
  console.log("\n✅ Migration complete!");
}

main().catch(console.error);
