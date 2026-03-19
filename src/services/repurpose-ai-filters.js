/**
 * Heuristic "AI-optimized" filter pack for repurposer (invisible fingerprint, no garish effects).
 * Keys align with client/src/utils/repurposeFiltersBrowser.js (ffmpeg.wasm path).
 * Used when the client requests useAiOptimization (+10 credits).
 */
export function buildAiRepurposeFilters({ isImage = false, hasAudio = true } = {}) {
  const base = {
    saturation: { enabled: true, min: 0.978, max: 1.022 },
    contrast: { enabled: true, min: 0.982, max: 1.018 },
    brightness: { enabled: true, min: -0.008, max: 0.008 },
    gamma: { enabled: true, min: 0.978, max: 1.022 },
    color_temp: { enabled: true, min: -0.018, max: 0.018 },
    hue: { enabled: true, min: -1.5, max: 1.5 },
    zoom: { enabled: true, min: 1.004, max: 1.012 },
    sharpen: { enabled: true, min: 0.4, max: 0.7 },
    speed: { enabled: true, min: 0.996, max: 1.004 },
    cut_video: { enabled: true, min: 0.05, max: 0.15 },
    cut_end_video: { enabled: true, min: 0.03, max: 0.1 },
    volume: { enabled: true, min: 0.985, max: 1.015 },
    flip: { enabled: false },
    vflip: { enabled: false },
    noise: { enabled: false, min: 1, max: 3 },
    vignette: { enabled: false, min: 0, max: 0.2 },
    rotation: { enabled: false, min: -1, max: 1 },
    pixel_shift: { enabled: false, min: -2, max: 2 },
    random_pixel_size: { enabled: false, min: 1, max: 1 },
    dimensions: { enabled: false, min_w: 1080, max_w: 1080, min_h: 1920, max_h: 1920 },
  };

  if (isImage) {
    base.speed = { ...base.speed, enabled: false };
    base.cut_video = { ...base.cut_video, enabled: false };
    base.cut_end_video = { ...base.cut_end_video, enabled: false };
    base.volume = { ...base.volume, enabled: false };
  }

  if (!hasAudio && !isImage) {
    base.volume = { ...base.volume, enabled: false };
    base.speed = { ...base.speed, enabled: false };
  }

  return base;
}
