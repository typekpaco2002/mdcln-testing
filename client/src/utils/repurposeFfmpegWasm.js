/**
 * Browser repurposer using ffmpeg.wasm. Applies metadata and optional video/audio filters (re-encode).
 */
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import {
  hasAnyFilterEnabled,
  randomizeValuesForBrowser,
  buildFilterChainsForBrowser,
} from "./repurposeFiltersBrowser.js";
import { scrubEncoderSignatures } from "./encoderScrubber.js";

const CORE_VERSION = "0.12.10";
const BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;

let ffmpegInstance = null;
let loadPromise = null;
let ffmpegLogHandler = null;

export function isFfmpegWasmSupported() {
  return typeof WebAssembly !== "undefined" && typeof Worker !== "undefined";
}

/**
 * Load FFmpeg core (single-thread; no SharedArrayBuffer required).
 * @returns {Promise<FFmpeg>}
 */
export async function loadFfmpeg(onLog) {
  if (onLog) ffmpegLogHandler = onLog;
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    ffmpeg.on("log", ({ message }) => {
      if (typeof ffmpegLogHandler === "function") ffmpegLogHandler(message);
    });
    await ffmpeg.load({
      coreURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();
  return loadPromise;
}

// Device-like encoder strings so output doesn't expose Lavf/FFmpeg (better for repurposer fingerprint).
const DEFAULT_ENCODER = "Apple iPhone";

function getMetadataArgs(metadataInstruction, isImage = false) {
  const creationTime =
    metadataInstruction?.creationTime != null
      ? String(metadataInstruction.creationTime).trim()
      : new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const comment =
    metadataInstruction?.comment != null && metadataInstruction.comment !== ""
      ? String(metadataInstruction.comment).trim()
      : "Repurposed";
  const args = ["-metadata", `creation_time=${creationTime}`, "-metadata", `comment=${comment}`];
  // For video, set encoder so MediaInfo/atoms show device (iPhone/Samsung etc.), not Lavf/FFmpeg.
  if (!isImage) {
    const encoder =
      metadataInstruction?.encoder != null && String(metadataInstruction.encoder).trim() !== ""
        ? String(metadataInstruction.encoder).trim()
        : DEFAULT_ENCODER;
    args.push("-metadata:s:v", `encoder=${encoder}`);
  }
  return args;
}

function buildArgsCopy(metadataInstruction, inputPath, outputPath, isImage) {
  const args = ["-i", inputPath];
  if (isImage && (outputPath.endsWith(".jpg") || outputPath.endsWith(".jpeg"))) {
    args.push("-c:v", "mjpeg");
  } else {
    args.push("-c", "copy", "-map", "0");
  }
  args.push(...getMetadataArgs(metadataInstruction, isImage), "-y", outputPath);
  return args;
}

function buildArgsWithFilters(metadataInstruction, inputPath, outputPath, isImage, videoFilter, audioFilter, hasAudio) {
  const args = ["-i", inputPath];
  const meta = getMetadataArgs(metadataInstruction, isImage);
  if (videoFilter && audioFilter) {
    args.push("-filter_complex", `[0:v]${videoFilter}[v];[0:a]${audioFilter}[a]`, "-map", "[v]", "-map", "[a]");
    args.push("-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "aac");
  } else if (videoFilter) {
    args.push("-vf", videoFilter);
    args.push("-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p");
    if (hasAudio) args.push("-c:a", "copy");
    else args.push("-an");
  } else if (audioFilter) {
    args.push("-c:v", "copy", "-af", audioFilter, "-c:a", "aac");
  }
  args.push(...meta, "-y", outputPath);
  return args;
}

function getInputExtension(mimeType, fileName) {
  if (fileName) {
    const ext = (fileName.split(".").pop() || "").toLowerCase().replace("jpeg", "jpg");
    if (ext) return ext;
  }
  if (!mimeType) return "mp4";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("heic") || mimeType.includes("heif")) return "heic";
  if (mimeType.includes("avif")) return "avif";
  if (mimeType.includes("image")) return "jpg";
  return "mp4";
}

/**
 * Reformatter: convert one file to target format in browser (image -> JPEG, video -> MP4).
 * @param {File} file
 * @param {"image"|"video"} targetKind
 * @param {(percent: number, message: string) => void} onProgress
 * @returns {Promise<Blob>}
 */
export async function runReformatInBrowser(file, targetKind, onProgress) {
  onProgress?.(15, "Loading converter…");
  const ffmpeg = await loadFfmpeg((msg) => onProgress?.(null, msg));
  onProgress?.(25, "Preparing file…");
  const ext = getInputExtension(file?.type, file?.name);
  const inputName = `input.${ext}`;
  const outputName = targetKind === "image" ? "output.jpg" : "output.mp4";

  const data = new Uint8Array(await file.arrayBuffer());
  await ffmpeg.writeFile(inputName, data);
  onProgress?.(40, targetKind === "image" ? "Converting image…" : "Converting video…");

  if (targetKind === "image") {
    await ffmpeg.exec(["-i", inputName, "-frames:v", "1", "-q:v", "2", "-y", outputName]);
  } else {
    await ffmpeg.exec([
      "-i", inputName,
      "-map", "0:v:0",
      "-map", "0:a:0?",
      "-c:v", "libx264",
      "-preset", "fast",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-movflags", "+faststart",
      "-y", outputName,
    ]);
  }

  onProgress?.(80, "Finalizing…");
  const outData = await ffmpeg.readFile(outputName);
  const mime = targetKind === "image" ? "image/jpeg" : "video/mp4";
  const blob = new Blob([outData], { type: mime });
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch (_) {}
  return blob;
}

function parseLogTimeSeconds(message) {
  if (!message || typeof message !== "string") return null;
  const m = message.match(/time=(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = Number(m[3]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || !Number.isFinite(ss)) return null;
  return hh * 3600 + mm * 60 + ss;
}

/**
 * @param {object} options - { filters, sourceInfo: { width, height, duration, hasAudio } }
 */
export async function runRepurposeInBrowser(file, outputs, metadataInstructionOrList, isImage, onProgress, options = {}) {
  const { filters, sourceInfo } = options;
  const useFilters = !isImage && hasAnyFilterEnabled(filters) && sourceInfo;
  const durationSec = !isImage ? Number(sourceInfo?.duration || 0) : 0;
  let copyLogUpdater = null;

  const ffmpeg = await loadFfmpeg((msg) => {
    if (typeof copyLogUpdater === "function") copyLogUpdater(msg);
  });
  const ext = getInputExtension(file?.type, file?.name);
  const inputName = isImage ? `input.${ext}` : `input.${ext}`;
  const results = [];

  const data = new Uint8Array(await file.arrayBuffer());
  await ffmpeg.writeFile(inputName, data);

  const total = outputs.length;
  for (let i = 0; i < total; i++) {
    const out = outputs[i];
    const metadataInstruction = Array.isArray(metadataInstructionOrList)
      ? (metadataInstructionOrList[i] || metadataInstructionOrList[0] || null)
      : metadataInstructionOrList;
    if (onProgress) onProgress(Math.round(((i + 0.05) / total) * 100), `Processing copy ${i + 1}/${total}...`);

    let bestPercent = Math.round(((i + 0.05) / total) * 100);
    copyLogUpdater = (logLine) => {
      if (!onProgress) return;
      const t = parseLogTimeSeconds(logLine);
      if (Number.isFinite(t) && durationSec > 0.1) {
        const copyPct = Math.max(0, Math.min(0.995, t / durationSec));
        const overall = Math.round(((i + copyPct) / total) * 100);
        if (overall > bestPercent) {
          bestPercent = overall;
          onProgress(bestPercent, `Processing copy ${i + 1}/${total}... ${Math.round(copyPct * 100)}%`);
        }
      }
    };

    let args;
    if (useFilters) {
      const values = randomizeValuesForBrowser(filters, sourceInfo);
      const { videoFilter, audioFilter, needsEncode, hasAudio } = buildFilterChainsForBrowser(values, filters, isImage);
      if (needsEncode && (videoFilter || audioFilter)) {
        args = buildArgsWithFilters(metadataInstruction, inputName, out.fileName, isImage, videoFilter, audioFilter, hasAudio);
      } else {
        args = buildArgsCopy(metadataInstruction, inputName, out.fileName, isImage);
      }
    } else {
      args = buildArgsCopy(metadataInstruction, inputName, out.fileName, isImage);
    }

    await ffmpeg.exec(args);
    copyLogUpdater = null;
    const outData = await ffmpeg.readFile(out.fileName);
    const buf = outData instanceof Uint8Array ? outData : new Uint8Array(outData);
    scrubEncoderSignatures(buf);
    const blob = new Blob([buf], { type: isImage ? "image/jpeg" : "video/mp4" });
    results.push({ fileName: out.fileName, blob });
    try {
      await ffmpeg.deleteFile(out.fileName);
    } catch (_) {}
  }

  try {
    await ffmpeg.deleteFile(inputName);
  } catch (_) {}

  if (onProgress) onProgress(100, "Done.");
  return results;
}
