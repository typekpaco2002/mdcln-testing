#!/usr/bin/env node
/**
 * Ensures FFmpeg and ffprobe binaries are available for Vercel serverless (and other Linux builds).
 * Run at build time via installCommand. Copies from @ffmpeg-installer/ffmpeg into ./bin/ so
 * the deployment bundle has a known path (bin/ffmpeg, bin/ffprobe) at runtime.
 * Only runs on Linux; no-op on other platforms.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const binDir = path.join(projectRoot, "bin");

if (process.platform !== "linux") {
  console.log("[ensure-ffmpeg] Skipping (not Linux)");
  process.exit(0);
}

function getFfmpegPath(require) {
  try {
    const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
    const p = ffmpegInstaller?.path;
    if (p && fs.existsSync(p)) return p;
  } catch (_) {}
  try {
    const linux64 = require("@ffmpeg-installer/linux-x64");
    const p = linux64?.path;
    if (p && fs.existsSync(p)) return p;
  } catch (_) {}
  return null;
}

async function main() {
  try {
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    let ffmpegPath = getFfmpegPath(require);
    if (!ffmpegPath) {
      console.warn("[ensure-ffmpeg] No FFmpeg binary from @ffmpeg-installer, skipping copy");
      process.exit(0);
    }
    const ffmpegDir = path.dirname(ffmpegPath);
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }
    const destFfmpeg = path.join(binDir, "ffmpeg");
    const destFfprobe = path.join(binDir, "ffprobe");
    const srcFfprobe = path.join(ffmpegDir, "ffprobe");
    fs.copyFileSync(ffmpegPath, destFfmpeg);
    fs.chmodSync(destFfmpeg, 0o755);
    if (fs.existsSync(srcFfprobe)) {
      fs.copyFileSync(srcFfprobe, destFfprobe);
      fs.chmodSync(destFfprobe, 0o755);
    }
    console.log("[ensure-ffmpeg] Copied ffmpeg (and ffprobe) to bin/");
  } catch (err) {
    console.warn("[ensure-ffmpeg] Failed to copy FFmpeg:", err?.message || err);
    process.exit(0);
  }
}

main();
