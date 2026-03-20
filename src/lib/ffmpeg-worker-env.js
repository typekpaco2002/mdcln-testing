/**
 * Resolved FFmpeg worker base URLs (no trailing slash).
 * Primary: FFMPEG_WORKER_URL. Optional backup: FFMPEG_WORKER_FALLBACK_URL (e.g. Easypanel ffpmeg).
 * Use when delegating repurpose jobs: try URLs in order until one succeeds.
 */
export function getFfmpegWorkerBaseUrls() {
  const primary = normalizeBase(process.env.FFMPEG_WORKER_URL);
  const fallback = normalizeBase(process.env.FFMPEG_WORKER_FALLBACK_URL);
  const urls = [];
  if (primary) urls.push(primary);
  if (fallback && fallback !== primary) urls.push(fallback);
  return urls;
}

function normalizeBase(raw) {
  const s = String(raw || "").trim().replace(/\/$/, "");
  return s || "";
}
