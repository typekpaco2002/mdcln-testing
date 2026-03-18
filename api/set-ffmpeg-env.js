/**
 * Set FFMPEG_PATH and FFPROBE_PATH from bundled npm packages (ffmpeg-static, ffprobe-static)
 * so the repurposer finds them on Vercel. Must be imported first in the serverless entry.
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
try {
  const ffmpegPath = require("ffmpeg-static");
  const ffprobe = require("ffprobe-static");
  if (ffmpegPath) process.env.FFMPEG_PATH = ffmpegPath;
  if (ffprobe?.path) process.env.FFPROBE_PATH = ffprobe.path;
} catch (_) {}
