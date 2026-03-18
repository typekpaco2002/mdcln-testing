/**
 * FFmpeg worker service — runs on Hetzner (or any server with ffmpeg + exiftool).
 * Receives repurpose jobs from the main app (Railway), runs processVideoBatch/processImageBatch,
 * uploads outputs to R2 via presigned PUT URLs, returns public URLs.
 *
 * Run from repo root: node ffmpeg-worker/server.js
 * Requires: FFMPEG_WORKER_API_KEY, PORT (default 3100)
 */
import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { processVideoBatch, processImageBatch, checkFfmpegAvailable } from "../src/services/video-repurpose.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3100;
const API_KEY = process.env.FFMPEG_WORKER_API_KEY;

app.use(express.json({ limit: "1mb" }));

function requireAuth(req, res, next) {
  const key = req.headers["x-api-key"] || req.query?.apiKey;
  if (!API_KEY || key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized", message: "Invalid or missing X-API-Key" });
  }
  next();
}

async function downloadToFile(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = path.extname(new URL(url).pathname) || ".bin";
  const tmp = path.join(os.tmpdir(), `ffmpeg-worker-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  fs.writeFileSync(tmp, buf);
  return tmp;
}

async function uploadToPutUrl(putUrl, filePath, contentType) {
  const body = fs.readFileSync(filePath);
  const res = await fetch(putUrl, {
    method: "PUT",
    body,
    headers: { "Content-Type": contentType || "application/octet-stream" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${res.statusText} - ${text.slice(0, 200)}`);
  }
}

/**
 * POST /job
 * Body: {
 *   inputUrl: string,           // presigned GET URL for video/image
 *   watermarkUrl?: string,       // optional presigned GET for watermark
 *   inputStem?: string,         // basename without extension for output naming (e.g. "myvideo" -> myvideo_repurpose_001.mp4)
 *   settings: { copies, filters, metadata },
 *   isImage: boolean,
 *   outputPutUrls: [ { putUrl, publicUrl, contentType? }, ... ]  // one per copy, order matters
 * }
 */
app.post("/job", requireAuth, async (req, res) => {
  const { inputUrl, watermarkUrl, inputStem, settings, isImage, outputPutUrls } = req.body || {};
  if (!inputUrl || !outputPutUrls?.length || !settings) {
    return res.status(400).json({ error: "Bad request", message: "inputUrl, outputPutUrls, and settings are required" });
  }

  const tempDir = path.join(os.tmpdir(), `ffmpeg-worker-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(tempDir, { recursive: true });
  let inputPath = null;
  let watermarkPath = null;

  try {
    inputPath = await downloadToFile(inputUrl);
    if (inputStem) {
      const ext = path.extname(inputPath);
      const renamed = path.join(tempDir, `${inputStem}${ext}`);
      fs.renameSync(inputPath, renamed);
      inputPath = renamed;
    } else {
      const moved = path.join(tempDir, path.basename(inputPath));
      fs.renameSync(inputPath, moved);
      inputPath = moved;
    }

    if (watermarkUrl) {
      watermarkPath = await downloadToFile(watermarkUrl);
      const wmDest = path.join(tempDir, path.basename(watermarkPath));
      fs.renameSync(watermarkPath, wmDest);
      watermarkPath = wmDest;
    }

    const outputDir = path.join(tempDir, "out");
    fs.mkdirSync(outputDir, { recursive: true });

    const progressCb = () => {}; // optional: could stream progress back later
    const processFn = isImage ? processImageBatch : processVideoBatch;
    const outputs = await processFn(inputPath, watermarkPath || null, outputDir, settings, progressCb, { useWasm: false });

    if (outputs.length > outputPutUrls.length) {
      throw new Error(`Worker produced ${outputs.length} outputs but only ${outputPutUrls.length} put URLs provided`);
    }

    const contentType = isImage ? "image/jpeg" : "video/mp4";
    for (let i = 0; i < outputs.length; i++) {
      const putSpec = outputPutUrls[i];
      const filePath = outputs[i].absolutePath;
      await uploadToPutUrl(putSpec.putUrl, filePath, putSpec.contentType || contentType);
    }

    const publicUrls = outputs.map((o, i) => outputPutUrls[i].publicUrl);
    return res.json({ ok: true, outputUrls: publicUrls, outputFileNames: outputs.map((o) => o.fileName) });
  } catch (e) {
    console.error("FFmpeg worker job error:", e);
    return res.status(500).json({
      error: "Job failed",
      message: e?.message || String(e),
    });
  } finally {
    try {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (watermarkPath && fs.existsSync(watermarkPath)) fs.unlinkSync(watermarkPath);
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  }
});

/**
 * GET /health — checks ffmpeg/ffprobe are available
 */
app.get("/health", async (_req, res) => {
  try {
    await checkFfmpegAvailable();
    return res.json({ ok: true, service: "ffmpeg-worker" });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e?.message || "FFmpeg check failed" });
  }
});

app.get("/", (_req, res) => {
  res.json({ service: "ffmpeg-worker", endpoints: ["GET /health", "POST /job (X-API-Key required)"] });
});

app.listen(PORT, () => {
  console.log(`FFmpeg worker listening on port ${PORT}`);
});
