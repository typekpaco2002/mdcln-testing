import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const PHOTOS_DIR = "/tmp/musclemommy_photos";

async function main() {
  const files = fs.readdirSync(PHOTOS_DIR).filter(f => f.match(/\.(png|jpg|jpeg|webp)$/i));
  console.log(`Found ${files.length} photos to upload to R2`);

  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(PHOTOS_DIR, file);
    const buffer = fs.readFileSync(filePath);
    
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    const ext = isPng ? "png" : "jpg";
    const contentType = isPng ? "image/png" : "image/jpeg";
    
    const timestamp = Date.now() + i;
    const randomId = Math.random().toString(36).substring(2, 10);
    const key = `generations/${timestamp}_${randomId}.${ext}`;
    
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    
    await s3Client.send(command);
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;
    const genId = randomUUID();
    results.push({ id: genId, url: publicUrl, ext });
    console.log(`[${i+1}/${files.length}] Uploaded: ${publicUrl} (id: ${genId})`);
  }

  // Output SQL for production DB insertion
  console.log("\n\n--- SQL INSERT STATEMENTS ---\n");
  for (const r of results) {
    const sql = `INSERT INTO "Generation" (id, "userId", "modelId", type, prompt, "creditsCost", "creditsRefunded", "actualCostUSD", "outputUrl", status, "isNsfw", "isTrial", "completedAt", "createdAt") VALUES ('${r.id}', 'fbfb2c4d-b872-4df1-ae44-e4d6b1b55593', '74cec983-9fae-47c7-a9ae-365eb0517b55', 'nsfw', 'MuscleMommy reference photo', 0, false, 0, '${r.url}', 'completed', true, false, NOW(), NOW());`;
    console.log(sql);
  }
  
  console.log("\n--- END SQL ---");
  console.log(`\nTotal: ${results.length} photos uploaded to R2. Run the SQL above against production DB.`);
}

main().catch(e => { console.error(e); process.exit(1); });
