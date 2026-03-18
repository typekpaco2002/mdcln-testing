/**
 * Browser-side repurpose filter builder. Samples random values from UI filter config
 * and builds FFmpeg -vf / -af / -filter_complex for ffmpeg.wasm (re-encode path).
 */

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function isEnabled(filters, key) {
  const v = filters?.[key];
  if (v == null) return false;
  if (typeof v === "object") return !!v.enabled;
  return !!v;
}

function sampleRange(cfg, def) {
  if (!cfg || !cfg.enabled) return def;
  let lo = parseFloat(cfg.min ?? def);
  let hi = parseFloat(cfg.max ?? def);
  if (lo > hi) [lo, hi] = [hi, lo];
  return rand(lo, hi);
}

/**
 * @param {object} filters - UI filters config (e.g. { saturation: { enabled, min, max }, ... })
 * @param {{ width?: number, height?: number, duration?: number, hasAudio?: boolean }} sourceInfo
 */
export function randomizeValuesForBrowser(filters, sourceInfo = {}) {
  const w = sourceInfo.width ?? 1920;
  const h = sourceInfo.height ?? 1080;
  return {
    saturation: sampleRange(filters?.saturation, 1),
    contrast: sampleRange(filters?.contrast, 1),
    brightness: sampleRange(filters?.brightness, 0),
    gamma: sampleRange(filters?.gamma, 1),
    vignette: sampleRange(filters?.vignette, 0),
    zoom: sampleRange(filters?.zoom, 1),
    noise: sampleRange(filters?.noise, 0),
    hue: sampleRange(filters?.hue, 0),
    rotation: sampleRange(filters?.rotation, 0),
    pixel_shift: sampleRange(filters?.pixel_shift, 0),
    random_pixel_size: sampleRange(filters?.random_pixel_size, 1),
    color_temp: sampleRange(filters?.color_temp, 0),
    sharpen: sampleRange(filters?.sharpen, 0.6),
    speed: sampleRange(filters?.speed, 1),
    volume: sampleRange(filters?.volume, 1),
    cut_video: sampleRange(filters?.cut_video, 0),
    cut_end_video: sampleRange(filters?.cut_end_video, 0),
    flip: isEnabled(filters, "flip"),
    vflip: isEnabled(filters, "vflip"),
    width: w,
    height: h,
    duration: sourceInfo.duration ?? 10,
    hasAudio: sourceInfo.hasAudio !== false,
  };
}

function atempoChain(speed) {
  const factors = [];
  let remaining = speed;
  while (remaining > 2.0) {
    factors.push(2.0);
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    factors.push(0.5);
    remaining *= 2.0;
  }
  factors.push(remaining);
  return factors;
}

/**
 * Build -vf filter string and optional -af for use with ffmpeg.wasm.
 * Returns { videoFilter, audioFilter, needsEncode, hasAudio }.
 * If both video and audio filters exist, caller must use -filter_complex.
 */
export function buildFilterChainsForBrowser(values, filters, isImage) {
  const vfParts = [];
  const afParts = [];
  const hasAudio = values.hasAudio && !isImage;
  const duration = values.duration ?? 10;

  const trimStart = Math.max(0, isEnabled(filters, "cut_video") ? values.cut_video : 0);
  const trimEnd = Math.max(0, isEnabled(filters, "cut_end_video") ? values.cut_end_video : 0);
  if (duration > 0 && !isImage && (trimStart > 0 || trimEnd > 0)) {
    const endAt = Math.max(0.1, duration - trimEnd);
    if (trimStart < endAt) {
      vfParts.push(`trim=start=${trimStart.toFixed(3)}:end=${endAt.toFixed(3)},setpts=PTS-STARTPTS`);
      if (hasAudio) afParts.push(`atrim=start=${trimStart.toFixed(3)}:end=${endAt.toFixed(3)},asetpts=PTS-STARTPTS`);
    }
  }

  // Subtle baseline so each copy differs
  vfParts.push(`eq=brightness=${rand(0.008, 0.012).toFixed(4)}:contrast=${rand(1.008, 1.015).toFixed(4)}:saturation=${rand(1.01, 1.02).toFixed(4)}:gamma=${rand(1.008, 1.015).toFixed(4)}`);
  if (hasAudio && afParts.length === 0) afParts.push("volume=1.002");
  else if (hasAudio && !afParts.some((s) => s.startsWith("volume"))) afParts.unshift("volume=1.002");

  if (isEnabled(filters, "saturation") || isEnabled(filters, "contrast") || isEnabled(filters, "brightness") || isEnabled(filters, "gamma")) {
    const terms = [];
    if (isEnabled(filters, "saturation")) terms.push(`saturation=${clamp(values.saturation, 0, 3).toFixed(4)}`);
    if (isEnabled(filters, "contrast")) terms.push(`contrast=${clamp(values.contrast, 0.5, 3).toFixed(4)}`);
    if (isEnabled(filters, "brightness")) terms.push(`brightness=${clamp(values.brightness, -1, 1).toFixed(4)}`);
    if (isEnabled(filters, "gamma")) terms.push(`gamma=${clamp(values.gamma, 0.1, 5).toFixed(4)}`);
    if (terms.length) vfParts.push(`eq=${terms.join(":")}`);
  }

  if (isEnabled(filters, "color_temp") && Math.abs(values.color_temp) > 0.001) {
    const v = clamp(values.color_temp, -0.5, 0.5);
    vfParts.push(`colorbalance=rs=${v.toFixed(4)}:gs=0:bs=${(-v).toFixed(4)}:rm=0:gm=0:bm=0:rh=0:gh=0:bh=0`);
  }

  if (isEnabled(filters, "hue") && Math.abs(values.hue) > 0.05) {
    vfParts.push(`hue=h=${values.hue.toFixed(3)}`);
  }

  if (isEnabled(filters, "vignette") && values.vignette > 0.01) {
    const strength = clamp(values.vignette, 0, 1);
    vfParts.push(`vignette=angle=${(Math.PI * strength).toFixed(4)}`);
  }

  if (isEnabled(filters, "zoom") && Math.abs(values.zoom - 1) > 0.01) {
    const z = clamp(values.zoom, 1, 2.5);
    vfParts.push(`scale=iw*${z.toFixed(4)}:ih*${z.toFixed(4)},crop=iw/${z.toFixed(4)}:ih/${z.toFixed(4)}`);
  }

  if (isEnabled(filters, "noise") && values.noise > 0.5) {
    const n = clamp(values.noise, 0, 100);
    vfParts.push(`noise=alls=${n.toFixed(2)}:allf=t`);
  }

  if (isEnabled(filters, "pixel_shift") && Math.abs(values.pixel_shift) > 0.5) {
    const ps = Math.round(clamp(values.pixel_shift, -10, 10));
    vfParts.push(`chromashift=cbh=${ps}:cbv=${ps}:crh=${-ps}:crv=${-ps}`);
  }

  if (isEnabled(filters, "random_pixel_size") && values.random_pixel_size > 1) {
    const px = Math.round(clamp(values.random_pixel_size, 1, 18));
    vfParts.push(`scale=iw/${px}:ih/${px}:flags=neighbor,scale=iw*${px}:ih*${px}:flags=neighbor`);
  }

  if (isEnabled(filters, "rotation") && Math.abs(values.rotation) > 0.05) {
    const a = values.rotation;
    vfParts.push(`scale=ceil(iw*1.12/2)*2:ceil(ih*1.12/2)*2,rotate=${a.toFixed(4)}*PI/180:ow=iw:oh=ih:c=black,crop=iw/1.12:ih/1.12:(iw-ow)/2:(ih-oh)/2,scale=trunc(iw/2)*2:trunc(ih/2)*2`);
  }

  if (values.flip) vfParts.push("hflip");
  if (values.vflip) vfParts.push("vflip");

  if (!isImage && hasAudio && isEnabled(filters, "speed") && Math.abs(values.speed - 1) > 0.001) {
    const speed = clamp(values.speed, 0.25, 4);
    vfParts.push(`setpts=PTS/${speed.toFixed(6)}`);
    for (const factor of atempoChain(speed)) {
      afParts.push(`atempo=${factor.toFixed(6)}`);
    }
  }

  if (hasAudio && isEnabled(filters, "volume") && Math.abs(values.volume - 1) > 0.01) {
    const vol = clamp(values.volume, 0, 3);
    afParts.push(`volume=${vol.toFixed(4)}`);
  }

  if (isEnabled(filters, "sharpen") && values.sharpen > 0.1) {
    const la = clamp(values.sharpen, 0.1, 3.0).toFixed(3);
    vfParts.push(`unsharp=lx=5:ly=5:la=${la}:cx=3:cy=3:ca=0`);
  }

  vfParts.push("scale=trunc(iw/2)*2:trunc(ih/2)*2");

  const videoFilter = vfParts.length ? vfParts.join(",") : null;
  const audioFilter = afParts.length ? afParts.join(",") : null;
  const needsEncode = !!videoFilter || !!audioFilter;

  return { videoFilter, audioFilter, needsEncode, hasAudio };
}

export function hasAnyFilterEnabled(filters) {
  if (!filters || typeof filters !== "object") return false;
  const keys = [
    "saturation", "contrast", "brightness", "gamma", "vignette", "zoom", "noise",
    "hue", "rotation", "pixel_shift", "random_pixel_size", "color_temp", "sharpen",
    "speed", "volume", "cut_video", "cut_end_video", "flip", "vflip",
  ];
  return keys.some((k) => isEnabled(filters, k));
}
