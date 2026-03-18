import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { isR2Configured, uploadBufferToR2 } from "../utils/r2.js";
import { getFfmpegPathSync } from "../utils/ffmpeg-path.js";

/** On Vercel /var/task is read-only; use /tmp. Else use cwd/temp. */
function getWritableTempDir() {
  if (process.env.VERCEL === "1") return path.join(os.tmpdir(), "mdlcln-video");
  const cwd = process.cwd();
  if (cwd === "/var/task" || path.basename(cwd) === "api") return path.join(os.tmpdir(), "mdlcln-video");
  return path.join(cwd, "temp");
}

let ffmpegPathSet = false;
function ensureFfmpegPath() {
  if (!ffmpegPathSet) {
    ffmpeg.setFfmpegPath(getFfmpegPathSync());
    ffmpegPathSet = true;
  }
}

/** Laplacian variance blur score (higher = sharper). Uses sharp if available. */
async function getFrameSharpness(framePath) {
  try {
    const sharp = (await import("sharp")).default;
    const { data: buf, info } = await sharp(framePath)
      .resize(400, null, { fit: "inside" })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const w = info.width || 0;
    const h = info.height || 0;
    if (w < 3 || h < 3 || !buf || buf.length < w * h) return 0;
    let sum = 0;
    let count = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const v = 4 * buf[i] - buf[i - 1] - buf[i + 1] - buf[i - w] - buf[i + w];
        sum += v;
        count++;
      }
    }
    if (count === 0) return 0;
    const mean = sum / count;
    let variance = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const v = 4 * buf[i] - buf[i - 1] - buf[i + 1] - buf[i - w] - buf[i + w];
        variance += (v - mean) ** 2;
      }
    }
    return count > 0 ? variance / count : 0;
  } catch {
    return 0;
  }
}

const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

async function uploadFrameToR2(filePath) {
  if (!isR2Configured()) {
    throw new Error("R2 not configured — cannot upload video frames");
  }
  const buffer = fs.readFileSync(filePath);
  return uploadBufferToR2(buffer, "frames", "jpg", "image/jpeg");
}

async function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration;
      resolve(duration);
    });
  });
}

async function extractSingleFrame(videoPath, timestamp, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timestamp)
      .frames(1)
      .output(outputPath)
      .outputOptions([
        '-q:v 1',
        '-vf scale=-1:1080'
      ])
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

async function extractFramesFromVideo(videoUrl, options = {}) {
  ensureFfmpegPath();
  const {
    numFrames = 10,
    customTimestamps = null
  } = options;

  const tempDir = getWritableTempDir();
  const videoFileName = `video_${Date.now()}.mp4`;
  const videoPath = path.join(tempDir, videoFileName);

  try {
    await mkdirAsync(tempDir, { recursive: true });

    console.log(`🎬 Downloading video from ${videoUrl}...`);
    
    const response = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(videoPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log('✅ Video downloaded');

    const duration = await getVideoDuration(videoPath);
    console.log(`📹 Video duration: ${duration.toFixed(2)}s`);

    const candidateCount = Math.max(numFrames * 2, 15);
    let timestamps;
    if (customTimestamps) {
      timestamps = customTimestamps;
    } else {
      const startOffset = duration * 0.05;
      const endOffset = duration * 0.95;
      const usableDuration = endOffset - startOffset;
      const interval = usableDuration / (candidateCount - 1);
      timestamps = Array.from({ length: candidateCount }, (_, i) =>
        Math.max(0, Math.floor(startOffset + (interval * i)))
      );
    }

    console.log(`🎯 Extracting ${timestamps.length} candidate frames (will pick sharpest ${numFrames})...`);

    const candidates = [];
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const frameFileName = `frame_${Date.now()}_${i}.jpg`;
      const framePath = path.join(tempDir, frameFileName);
      await extractSingleFrame(videoPath, timestamp, framePath);
      const sharpness = await getFrameSharpness(framePath);
      candidates.push({ timestamp, framePath, sharpness });
    }

    candidates.sort((a, b) => b.sharpness - a.sharpness);
    const toUpload = candidates.slice(0, numFrames);

    const frames = [];
    for (let i = 0; i < toUpload.length; i++) {
      const { timestamp, framePath } = toUpload[i];
      const r2Url = await uploadFrameToR2(framePath);
      frames.push({ id: i + 1, timestamp, url: r2Url, quality: "high" });
      await unlinkAsync(framePath);
    }
    for (const c of candidates.slice(numFrames)) {
      try { await unlinkAsync(c.framePath); } catch (_) {}
    }

    await unlinkAsync(videoPath);

    console.log(`✅ Successfully extracted ${frames.length} high-quality frames`);

    return {
      success: true,
      frames,
      videoDuration: duration
    };

  } catch (error) {
    console.error('❌ Frame extraction error:', error);

    try {
      if (fs.existsSync(videoPath)) {
        await unlinkAsync(videoPath);
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    return {
      success: false,
      error: error.message
    };
  }
}

async function extractFrameFromVideo(videoUrl, timestamp = 3) {
  try {
    console.log('⚠️  Using legacy single-frame extraction');
    
    const result = await extractFramesFromVideo(videoUrl, {
      numFrames: 1,
      customTimestamps: [timestamp]
    });

    if (result.success && result.frames.length > 0) {
      return {
        success: true,
        frameUrl: result.frames[0].url
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to extract frame'
    };

  } catch (error) {
    console.error('❌ Frame extraction error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function generateVariations(generateImageFunction, modelImages, targetImage, count = 3, options = {}) {
  console.log(`🎨 Generating ${count} variations...`);
  
  const variations = [];
  
  for (let i = 0; i < count; i++) {
    console.log(`  📸 Generating variation ${i + 1}/${count}...`);
    
    const seed = Date.now() + i * 1000;
    const result = await generateImageFunction(modelImages, targetImage, {
      ...options,
      seed
    });
    
    if (result.success) {
      variations.push({
        id: i + 1,
        imageUrl: result.outputUrl,
        seed
      });
      console.log(`  ✅ Variation ${i + 1} complete: ${result.outputUrl}`);
    } else {
      console.error(`  ❌ Variation ${i + 1} failed: ${result.error}`);
    }
    
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`✅ Generated ${variations.length}/${count} variations`);
  
  return variations;
}

function calculateBestFrameTimestamp(videoDuration = 10) {
  const timestamp = Math.floor(videoDuration / 2);
  console.log(`🎯 Using middle frame at ${timestamp}s (video duration: ${videoDuration}s)`);
  return timestamp;
}

/**
 * Preprocess reference video for Kling: denoise and scale to 720p for better motion quality.
 * Returns preprocessed URL or original URL on failure (non-breaking).
 */
async function preprocessReferenceVideoForKling(videoUrl) {
  if (!videoUrl || !videoUrl.startsWith("http")) return videoUrl;
  ensureFfmpegPath();
  const tempDir = getWritableTempDir();
  const inPath = path.join(tempDir, `ref_${Date.now()}_in.mp4`);
  const outPath = path.join(tempDir, `ref_${Date.now()}_out.mp4`);
  try {
    await mkdirAsync(tempDir, { recursive: true });
    const response = await axios({ method: "get", url: videoUrl, responseType: "stream" });
    const writer = fs.createWriteStream(inPath);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
    await new Promise((resolve, reject) => {
      ffmpeg(inPath)
        .outputOptions(["-vf", "hqdn3d=1.5:3:6:2.5,scale=-2:720", "-c:a", "copy", "-movflags", "+faststart"])
        .output(outPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
    if (!isR2Configured()) {
      console.warn("⚠️ R2 not configured, skipping reference video upload after preprocessing");
      return videoUrl;
    }
    const buffer = fs.readFileSync(outPath);
    const url = await uploadBufferToR2(buffer, "generations", "mp4", "video/mp4");
    console.log("✅ Reference video preprocessed (denoise + 720p):", url?.slice(0, 60));
    return url;
  } catch (err) {
    console.warn("⚠️ Reference video preprocessing failed, using original:", err?.message);
    return videoUrl;
  } finally {
    try {
      if (fs.existsSync(inPath)) await unlinkAsync(inPath);
      if (fs.existsSync(outPath)) await unlinkAsync(outPath);
    } catch (_) {}
  }
}

/**
 * Preprocess audio for talking head: normalize to -14 LUFS and trim leading/trailing silence.
 * Returns processed buffer or original on failure.
 */
async function preprocessAudioForTalkingHead(audioBuffer) {
  if (!Buffer.isBuffer(audioBuffer) || audioBuffer.length === 0) return audioBuffer;
  ensureFfmpegPath();
  const tempDir = getWritableTempDir();
  const inPath = path.join(tempDir, `th_audio_${Date.now()}_in.mp3`);
  const outPath = path.join(tempDir, `th_audio_${Date.now()}_out.mp3`);
  try {
    await mkdirAsync(tempDir, { recursive: true });
    fs.writeFileSync(inPath, audioBuffer);
    await new Promise((resolve, reject) => {
      ffmpeg(inPath)
        .audioFilters([
          "silenceremove=start_periods=1:start_duration=0.1:start_threshold=-50dB",
          "silenceremove=stop_periods=1:stop_duration=0.1:stop_threshold=-50dB",
        ])
        .audioFrequency(44100)
        .output(outPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
    const outBuffer = fs.readFileSync(outPath);
    return outBuffer;
  } catch (err) {
    console.warn("⚠️ Talking head audio preprocessing failed, using original:", err?.message);
    return audioBuffer;
  } finally {
    try {
      if (fs.existsSync(inPath)) await unlinkAsync(inPath);
      if (fs.existsSync(outPath)) await unlinkAsync(outPath);
    } catch (_) {}
  }
}

export {
  extractFrameFromVideo,
  extractFramesFromVideo,
  generateVariations,
  calculateBestFrameTimestamp,
  preprocessReferenceVideoForKling,
  preprocessAudioForTalkingHead,
};
