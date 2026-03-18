/**
 * Upload the referral program video to R2 at a fixed key so the Refer and Earn page can embed it.
 * Usage: node scripts/upload-referral-video.js "<path-to-video.mp4>"
 * Example: node scripts/upload-referral-video.js "C:\Users\mconq\Downloads\affil video.mp4"
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { uploadToR2 } from "../src/utils/r2.js";

const REFERRAL_VIDEO_KEY = "referral-videos/kuba-first-1k.mp4";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/upload-referral-video.js \"<path-to-video.mp4>\"");
  process.exit(1);
}

try {
  const buffer = readFileSync(filePath);
  const url = await uploadToR2(buffer, REFERRAL_VIDEO_KEY, "video/mp4");
  console.log("Uploaded. Referral video URL:", url);
} catch (err) {
  console.error("Upload failed:", err.message);
  process.exit(1);
}
