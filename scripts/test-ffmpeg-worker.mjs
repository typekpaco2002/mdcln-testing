#!/usr/bin/env node
/**
 * Integration tests for the standalone FFmpeg worker (ffpmeg / Easypanel).
 *
 * Usage:
 *   FFMPEG_WORKER_URL=https://automations-ffpmeg... FFMPEG_WORKER_API_KEY=secret node scripts/test-ffmpeg-worker.mjs
 *
 * Optional:
 *   FFMPEG_WORKER_CALLBACK_TEST=1  — test callbackUrl (uses curl.exe to create webhook.site URL; Node fetch is often blocked)
 */

import { execFileSync } from "child_process";

const BASE = (process.env.FFMPEG_WORKER_URL || "").replace(/\/$/, "");
const API_KEY = process.env.FFMPEG_WORKER_API_KEY || "";

if (!BASE || !API_KEY) {
  console.error("Set FFMPEG_WORKER_URL and FFMPEG_WORKER_API_KEY");
  process.exit(1);
}

/** Same shape as VideoRepurposerPage `initMetaState()` + device model (modelclone UI). */
function modelcloneFullMetadata() {
  const selected = new Date();
  selected.setSeconds(0, 0);
  const dateTaken = new Date(selected.getTime() - selected.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return {
    device_metadata: {
      enabled: true,
      platform: "multi",
      modelKey: "iphone-15-pro",
      uniqueDevicePerCopy: false,
      deviceMode: "single",
      modelKeys: ["", "", "", "", ""],
    },
    timestamps: { enabled: true, date_taken: dateTaken },
    gps_location: { enabled: true, mode: "pinpoint", country: "US", lat: 40.7128, lng: -74.006 },
    recording_app: { enabled: true },
    audio_device: { enabled: true },
    color_profile: { enabled: true },
  };
}

function modelcloneFiltersLight() {
  return {
    saturation: { enabled: true, min: 0.92, max: 1.08 },
    contrast: { enabled: true, min: 0.94, max: 1.06 },
    brightness: { enabled: false, min: -0.05, max: 0.05 },
    gamma: { enabled: false, min: 0.9, max: 1.1 },
    vignette: { enabled: false, min: 0, max: 0.3 },
    speed: { enabled: true, min: 0.98, max: 1.02 },
    zoom: { enabled: false, min: 1.0, max: 1.05 },
    noise: { enabled: false, min: 0, max: 5 },
    volume: { enabled: true, min: 0.95, max: 1.05 },
    pixel_shift: { enabled: false, min: -1, max: 1 },
    rotation: { enabled: false, min: -1, max: 1 },
    lens_correction: { enabled: false, min: -0.1, max: 0.1 },
    framerate: { enabled: false, min: 28, max: 32 },
    video_bitrate: { enabled: false, min: 4000, max: 6000 },
    audio_bitrate: { enabled: false, min: 160, max: 256 },
    cut_video: { enabled: false, min: 0, max: 0.5 },
    cut_end_video: { enabled: false, min: 0, max: 0.5 },
    random_pixel_size: { enabled: false, min: 1, max: 1 },
    pitch_shift: { enabled: false, min: 0.98, max: 1.02 },
    audio_highpass: { enabled: false, min: 60, max: 100 },
    audio_lowpass: { enabled: false, min: 14000, max: 18000 },
    audio_noise: { enabled: false, min: 0.001, max: 0.003 },
    color_temp: { enabled: false, min: -0.06, max: 0.06 },
    keyframe_interval: { enabled: false, min: 40, max: 120 },
    hue: { enabled: false, min: -2, max: 2 },
    sharpen: { enabled: false, min: 0.5, max: 1.0 },
    denoise: { enabled: false, min: 1.0, max: 3.0 },
    flip: { enabled: false },
    vflip: { enabled: false },
    blurred_border: { enabled: false },
    colorlevels: { enabled: false },
    deband: { enabled: false },
    deflicker: { enabled: false },
    encoder_fingerprint: { enabled: false },
    dimensions: { enabled: false, min_w: 1080, max_w: 1080, min_h: 1920, max_h: 1920 },
  };
}

async function postJob(name, body) {
  const t0 = Date.now();
  const r = await fetch(`${BASE}/job`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  const ms = Date.now() - t0;
  const ok = r.ok && json.ok === true;
  console.log(`\n── ${name} ── HTTP ${r.status} (${ms}ms)`);
  console.log(JSON.stringify(json, null, 2));
  return { ok, status: r.status, json, ms };
}

async function main() {
  const health = await fetch(`${BASE}/health`);
  console.log("GET /health", health.status, await health.text());

  const inputImage =
    process.env.TEST_IMAGE_URL || "https://0x0.st/P9Uo.png";
  const inputVideo =
    process.env.TEST_VIDEO_URL || "https://www.w3schools.com/html/mov_bbb.mp4";

  const put = "https://httpbin.org/put";
  const pub = "https://httpbin.org/anything/out";

  // 1) Image — minimal settings (like first test)
  await postJob("image minimal", {
    inputUrl: inputImage,
    isImage: true,
    settings: { copies: 1, filters: {}, metadata: {} },
    outputPutUrls: [{ putUrl: put, publicUrl: `${pub}/img-min.jpg` }],
  });

  // 2) Image — full modelclone metadata + light filters (2 copies)
  await postJob("image full metadata + 2 copies", {
    inputUrl: inputImage,
    isImage: true,
    inputStem: "modelclone_test",
    settings: {
      copies: 2,
      filters: modelcloneFiltersLight(),
      metadata: modelcloneFullMetadata(),
    },
    outputPutUrls: [
      { putUrl: put, publicUrl: `${pub}/img-1.jpg` },
      { putUrl: put, publicUrl: `${pub}/img-2.jpg` },
    ],
  });

  // 3) Video — full metadata + video filters
  await postJob("video full metadata", {
    inputUrl: inputVideo,
    isImage: false,
    settings: {
      copies: 1,
      filters: modelcloneFiltersLight(),
      metadata: modelcloneFullMetadata(),
    },
    outputPutUrls: [{ putUrl: put, publicUrl: `${pub}/vid-1.mp4` }],
  });

  // 4) Callback + jobRef (optional webhook)
  let callbackUrl = null;
  if (process.env.FFMPEG_WORKER_CALLBACK_TEST === "1") {
    callbackUrl = createWebhookSiteInspectUrl();
    if (callbackUrl) console.log("\nCallback inspect:", callbackUrl);
    else console.log("\n(callback test: could not create webhook.site URL via curl.exe)");
  }

  await postJob("image + callback + jobRef", {
    inputUrl: inputImage,
    isImage: true,
    settings: { copies: 1, filters: {}, metadata: modelcloneFullMetadata() },
    outputPutUrls: [{ putUrl: put, publicUrl: `${pub}/cb.jpg` }],
    callbackUrl: callbackUrl || undefined,
    callbackSecret: callbackUrl ? "test-secret-cb" : undefined,
    jobRef: { testRun: true, kind: "integration", at: new Date().toISOString() },
  });

  if (callbackUrl) {
    console.log("\nOpen webhook.site tab to see POST body from worker (callback).");
  }

  console.log("\nDone. modelclone will call the same POST /job with presigned R2 URLs when wired.");
}

/** webhook.site often returns 401 to Node fetch; curl.exe works. */
function createWebhookSiteInspectUrl() {
  try {
    const out = execFileSync(
      "curl.exe",
      ["-s", "-X", "POST", "https://webhook.site/token", "-H", "Accept: application/json"],
      { encoding: "utf8", maxBuffer: 1_000_000 },
    );
    const j = JSON.parse(out);
    if (j?.uuid) return `https://webhook.site/${j.uuid}`;
  } catch {
    /* ignore */
  }
  return null;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
