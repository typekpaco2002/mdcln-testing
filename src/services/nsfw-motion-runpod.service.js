/**
 * NSFW Motion X — RunPod serverless adapter (admin test path).
 *
 * Default user flow stays on RunningHub (see `nsfw-motion.service.js`). This
 * adapter targets the `mconqeuroror/motion` worker (mirrored under
 * `runpod-mdcln-motion/`) and is reachable only via the admin "Run via RunPod"
 * button in Create → Video → Recreate. Wired through:
 *   POST /api/nsfw/generate-motion-video        body.provider === "runpod"
 *   POST /api/runpod/callback                   row.provider === "runpod-motion"
 *   reconcileStaleRunpodGenerations             row.provider === "runpod-motion"
 *
 * The worker accepts media as https URLs (preferred — avoids RunPod's 10 MiB
 * /run body cap) and patches nodes 167 (reference image) and 52 (driving
 * video) server-side. Output node 226 (VHS_VideoCombine) returns mp4.
 *
 * Output transport (chosen at submit time):
 * 1. PREFERRED — backend mints a presigned R2 PUT URL (R2 is used here as a
 *    transit hop because Vercel Blob has no equivalent presigned-PUT API; its
 *    client-upload flow needs a `handleUpload` token round-trip that's awkward
 *    from a Python worker). Worker PUTs the mp4 directly to R2, returns a
 *    tiny `{ output_url, videos:[{ url }] }` payload — avoids Vercel's 4.5 MB
 *    webhook body cap and keeps `/status` responses small. The materializer
 *    then mirrors the R2 file to Vercel Blob so the user-facing URL ends up
 *    on Blob (consistent with the rest of the app); the transient R2 object
 *    is deleted best-effort after the mirror succeeds.
 * 2. FALLBACK — if R2 isn't configured the worker still emits
 *    `videos[].base64`; the materializer decodes + uploads to Blob. Works on
 *    long-lived hosts but webhooks may get truncated by serverless edges.
 *
 * @see runpod-mdcln-motion/handler.py
 * @see runpod-mdcln-motion/workflow_api.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  uploadBufferToBlobOrR2,
  mirrorProviderOutputUrl,
  isVercelBlobConfigured,
} from "../utils/kieUpload.js";
import { getR2PresignedPutForKey, isR2Configured, deleteFromR2 } from "../utils/r2.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_MOTION_ENDPOINT_ID = (process.env.RUNPOD_MOTION_ENDPOINT_ID || "").trim() || null;
const MOTION_OUTPUT_NODE = "226"; // VHS_VideoCombine in workflow_api.json
// Bumped from 25s → 120s: completed motion jobs can return 30-80 MB `/status`
// responses (worker base64) which take 5-30s to download on a slow link, and
// 25s consistently timed out on prod (rows stuck 24h+).
const POLL_TIMEOUT_MS = 120_000;
const PRESIGN_EXPIRES_SEC = 6 * 60 * 60; // 6h: matches RunPod's max job runtime

if (RUNPOD_MOTION_ENDPOINT_ID) {
  console.log(`[NSFW Motion-RP] endpoint=${RUNPOD_MOTION_ENDPOINT_ID}`);
}

/** @returns {boolean} */
export function isNsfwMotionRunpodConfigured() {
  return Boolean(RUNPOD_API_KEY && RUNPOD_MOTION_ENDPOINT_ID);
}

let _cachedWorkflow = null;

function loadMotionWorkflow() {
  if (_cachedWorkflow) return _cachedWorkflow;
  const candidates = [
    path.join(process.cwd(), "runpod-mdcln-motion", "workflow_api.json"),
    path.join(__dirname, "..", "..", "runpod-mdcln-motion", "workflow_api.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        _cachedWorkflow = JSON.parse(fs.readFileSync(p, "utf8"));
        return _cachedWorkflow;
      } catch (e) {
        console.error("[NSFW Motion-RP] Failed to parse workflow:", e.message);
        return null;
      }
    }
  }
  console.error("[NSFW Motion-RP] workflow_api.json not found in:", candidates);
  return null;
}

function randomSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

/**
 * Build the worker input. Both media inputs go in as https URLs; the handler
 * downloads them and patches node 167 / 52 before queueing the prompt.
 *
 * @param {{
 *   referenceImageUrl: string,
 *   drivingVideoUrl: string,
 *   prompt?: string | null,
 *   seed?: number | null,
 *   outputUploadUrl?: string | null,
 *   outputPublicUrl?: string | null,
 *   outputKey?: string | null,
 * }} args
 */
export function buildNsfwMotionRunpodInput(args) {
  const wf = loadMotionWorkflow();
  if (!wf) throw new Error("Motion-X (RunPod) workflow not found");

  // Workflow uses lots of `easy seed` + `KSampler` nodes that take a `seed`
  // input. We don't try to hunt every one — the handler.py exposes only the
  // top-level seed knob via the workflow JSON itself. Letting Comfy choose
  // its own seeds when omitted keeps regen non-deterministic, which matches
  // the RH path that also doesn't honor a user-supplied seed today.
  const seed = Number.isFinite(args?.seed) ? Number(args.seed) : randomSeed();

  const out = {
    prompt: wf,
    reference_image_url: args.referenceImageUrl,
    driving_video_url: args.drivingVideoUrl,
    output_node_id: MOTION_OUTPUT_NODE,
    output_type: "video",
    seed,
  };
  if (args.outputUploadUrl) {
    out.output_upload_url = args.outputUploadUrl;
    if (args.outputPublicUrl) out.output_public_url = args.outputPublicUrl;
    if (args.outputKey) out.output_key = args.outputKey;
  }
  return out;
}

/**
 * Mint a presigned R2 PUT URL for the worker to upload its rendered mp4 to.
 * Returns null when R2 isn't configured (worker will fall back to base64).
 *
 * @param {string} generationId
 * @returns {Promise<{ uploadUrl: string, publicUrl: string, key: string } | null>}
 */
export async function mintMotionOutputUploadUrl(generationId) {
  if (!isR2Configured()) {
    console.warn("[NSFW Motion-RP] R2 not configured — worker will return base64 (large /status responses)");
    return null;
  }
  const safeId = String(generationId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "unknown";
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  const key = `generations/nsfw-video-motion/${safeId}_${ts}_${rand}.mp4`;
  try {
    return await getR2PresignedPutForKey(key, "video/mp4", PRESIGN_EXPIRES_SEC);
  } catch (e) {
    console.warn("[NSFW Motion-RP] presign mint failed:", e?.message || e);
    return null;
  }
}

/**
 * Submit a Motion-X job to RunPod. Mirrors the contract used by
 * `submitNsfwMotionVideo` (RH) — returns a job id usable for polling and
 * matched by the webhook handler.
 *
 * @param {{
 *   referenceImageUrl: string,
 *   drivingVideoUrl: string,
 *   prompt?: string | null,
 *   seed?: number | null,
 *   webhookUrl?: string | null,
 *   outputUploadUrl?: string | null,
 *   outputPublicUrl?: string | null,
 *   outputKey?: string | null,
 * }} args
 * @returns {Promise<{ runpodJobId: string }>}
 */
export async function submitNsfwMotionRunpodJob(args) {
  if (!isNsfwMotionRunpodConfigured()) {
    throw new Error(
      "NSFW Motion-X RunPod path not configured (RUNPOD_API_KEY or RUNPOD_MOTION_ENDPOINT_ID missing)",
    );
  }
  if (!args?.referenceImageUrl || !args?.drivingVideoUrl) {
    throw new Error("referenceImageUrl and drivingVideoUrl are required");
  }

  const input = buildNsfwMotionRunpodInput(args);
  const base = `https://api.runpod.ai/v2/${RUNPOD_MOTION_ENDPOINT_ID}`;

  const body = { input };
  if (args.webhookUrl) {
    body.webhook = args.webhookUrl;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  let resp;
  try {
    resp = await fetch(`${base}/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Motion-X (RunPod) submit failed ${resp.status}: ${text.slice(0, 400)}`);
  }
  const data = await resp.json();
  const jobId =
    data.id ||
    data.request_id ||
    data.requestId ||
    data.task_id ||
    data.taskId;
  if (!jobId) {
    throw new Error(`Motion-X (RunPod) submit returned no job id: ${JSON.stringify(data).slice(0, 400)}`);
  }
  console.log(`[NSFW Motion-RP] Job submitted: ${jobId} → endpoint=${RUNPOD_MOTION_ENDPOINT_ID}`);
  return { runpodJobId: String(jobId) };
}

/**
 * Poll RunPod for a Motion-X job. Returns the raw `/status` JSON; callers
 * normalize via `resolveRunpodPollCanonicalStatus` (lib/runpod-job-status.js)
 * to map COMPLETED / FAILED / IN_QUEUE / IN_PROGRESS.
 *
 * Mirrors `pollUpscalerJob`'s 3-attempt retry on network errors.
 *
 * @param {string} runpodJobId
 */
export async function pollNsfwMotionRunpodJob(runpodJobId) {
  if (!isNsfwMotionRunpodConfigured()) {
    throw new Error("NSFW Motion-X RunPod path not configured");
  }
  const url = `https://api.runpod.ai/v2/${RUNPOD_MOTION_ENDPOINT_ID}/status/${encodeURIComponent(runpodJobId)}`;

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), POLL_TIMEOUT_MS);
    try {
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`Motion-X (RunPod) poll failed ${resp.status}: ${text.slice(0, 400)}`);
      }
      const contentLength = Number(resp.headers.get("content-length") || 0);
      if (contentLength > 4 * 1024 * 1024) {
        console.warn(
          `[NSFW Motion-RP] poll job=${runpodJobId} returning large body (${Math.round(contentLength / 1024 / 1024)} MB) — ` +
          `worker should use output_upload_url to avoid webhook truncation`,
        );
      }
      return resp.json();
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < 3) {
        const wait = 1500 * attempt;
        console.warn(`[NSFW Motion-RP] poll attempt ${attempt}/3 failed: ${err.message} — retrying in ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}

/**
 * Adapter for `generation-poller.service.js`: returns a normalized
 * `{ status, error }` envelope so the existing motion-x branch (which speaks
 * the RH shape via `checkNsfwMotionStatus`) can call into the RunPod path
 * with no further changes downstream.
 *
 * @param {string} runpodJobId
 * @returns {Promise<Record<string, unknown>>}
 */
export async function checkNsfwMotionStatusRunpod(runpodJobId) {
  const rp = await pollNsfwMotionRunpodJob(runpodJobId);
  const raw = String(rp?.status || "").toLowerCase();
  let status = raw;
  if (["success", "succeeded", "done", "complete", "finished", "ok"].includes(raw)) {
    status = "completed";
  } else if (["error", "errored", "failure"].includes(raw)) {
    status = "failed";
  }
  return { ...rp, status };
}

function isHttpUrlLike(v) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

function looksLikeR2Url(url) {
  if (!url || typeof url !== "string") return false;
  const r2pub = process.env.R2_PUBLIC_URL;
  if (r2pub && url.startsWith(r2pub)) return true;
  return /\bcloudflarestorage\.com\b|\br2\.dev\b/.test(url);
}

function looksLikeBlobUrl(url) {
  return typeof url === "string" && (url.includes("vercel-storage.com") || url.includes("blob.vercel.app"));
}

/**
 * Mirror an R2 transit URL to Vercel Blob so the persisted generation URL
 * matches the rest of the app's storage (Blob). Best-effort deletes the
 * transient R2 object after a successful mirror — never throws if cleanup
 * fails. When Blob isn't configured (or mirror fails), returns the R2 URL
 * unchanged so the row still completes.
 */
async function persistMotionOutputToBlob(transitUrl, logTag = "") {
  if (!isHttpUrlLike(transitUrl)) return transitUrl;
  if (looksLikeBlobUrl(transitUrl)) return transitUrl;
  if (!isVercelBlobConfigured()) return transitUrl;
  try {
    const persisted = await mirrorProviderOutputUrl(transitUrl, "video/mp4");
    if (looksLikeBlobUrl(persisted) && looksLikeR2Url(transitUrl)) {
      // R2 hop served its purpose; remove the now-redundant transient object.
      deleteFromR2(transitUrl).catch((e) =>
        console.warn(`[NSFW Motion-RP] R2 transit cleanup failed: ${e?.message || e}`),
      );
    }
    if (persisted !== transitUrl) {
      console.log(`[NSFW Motion-RP] ${logTag} mirrored R2 transit → Blob (${String(persisted).slice(0, 96)})`);
    }
    return persisted;
  } catch (e) {
    console.warn(`[NSFW Motion-RP] ${logTag} Blob mirror failed (${e?.message || e}) — keeping R2 URL`);
    return transitUrl;
  }
}

function pickVideoFromArray(arr) {
  if (!Array.isArray(arr)) return null;
  for (const v of arr) {
    if (!v) continue;
    if (typeof v === "string") {
      if (isHttpUrlLike(v) || v.length > 200) return { kind: typeof v === "string" && isHttpUrlLike(v) ? "url" : "base64", value: v };
      continue;
    }
    if (typeof v === "object") {
      if (typeof v.url === "string" && isHttpUrlLike(v.url)) return { kind: "url", value: v.url };
      if (typeof v.base64 === "string" && v.base64.length > 200) return { kind: "base64", value: v.base64 };
      if (typeof v.data === "string" && v.data.length > 200) return { kind: "base64", value: v.data };
      if (typeof v.image === "string" && v.image.length > 200) return { kind: "base64", value: v.image };
    }
  }
  return null;
}

/**
 * Pull the mp4 out of a RunPod `/status` or webhook payload from the
 * Motion-X worker. Handler shape (see runpod-mdcln-motion/handler.py):
 *
 *   PREFERRED (worker uploaded to presigned R2 URL):
 *     { output: { status: "COMPLETED", output_url: "https://...", videos: [{ url: "..." }] } }
 *
 *   LEGACY FALLBACK (worker returned base64):
 *     { output: { status: "COMPLETED", videos: [{ base64, filename, ... }] } }
 *
 * Tolerates a few legacy shapes:
 *   - top-level (no `output` wrapper)
 *   - `output.outputs["226"].videos[]` (node-keyed)
 *   - `images[]` fallback if a workflow tweak produced still frames
 *
 * Returns a public https URL. For URL outputs returns directly; for base64 it
 * decodes + uploads to Blob/R2. Returns null when nothing usable was found —
 * callers should mark the row failed and refund.
 *
 * @param {unknown} rp
 * @param {{ generationId?: string | null }} [logCtx]
 * @returns {Promise<string | null>}
 */
export async function materializeNsfwMotionRunpodVideoOutput(rp, logCtx = {}) {
  if (!rp || typeof rp !== "object") return null;
  const out = rp.output !== undefined && rp.output !== null ? rp.output : rp;
  const tag = logCtx.generationId ? `gen=${String(logCtx.generationId).slice(0, 8)}` : "";

  // Direct URL output from worker (preferred path — worker PUT mp4 to presigned R2 URL).
  if (out && typeof out === "object" && typeof out.output_url === "string" && isHttpUrlLike(out.output_url)) {
    console.log(`[NSFW Motion-RP materializer] ${tag} using worker output_url (${out.output_url.slice(0, 96)})`);
    return await persistMotionOutputToBlob(out.output_url, tag);
  }

  /** @type {{ kind: "url" | "base64", value: string } | null} */
  let pick = null;

  pick = pickVideoFromArray(out?.videos);
  if (!pick) {
    const nodeOutputs = out?.outputs && typeof out.outputs === "object" ? out.outputs : null;
    if (nodeOutputs) {
      const preferred = MOTION_OUTPUT_NODE;
      const order = [preferred, ...Object.keys(nodeOutputs).filter((k) => k !== preferred)];
      for (const k of order) {
        pick = pickVideoFromArray(nodeOutputs[k]?.videos) || pickVideoFromArray(nodeOutputs[k]?.gifs);
        if (pick) break;
      }
    }
  }
  if (!pick) pick = pickVideoFromArray(out?.images);

  if (!pick) {
    if (typeof out === "string" && out.length > 200) {
      pick = { kind: isHttpUrlLike(out) ? "url" : "base64", value: out };
    }
  }

  if (!pick) {
    const outKeys = out && typeof out === "object" ? Object.keys(out).slice(0, 10) : [];
    console.warn(
      `[NSFW Motion-RP materializer] ${tag} no video/url found — outKeys=${JSON.stringify(outKeys)} ` +
      `outType=${out == null ? "null" : typeof out}`,
    );
    return null;
  }

  if (pick.kind === "url") {
    console.log(`[NSFW Motion-RP materializer] ${tag} URL pick (${String(pick.value).slice(0, 96)})`);
    return await persistMotionOutputToBlob(pick.value, tag);
  }

  try {
    const cleaned = pick.value.replace(/^data:[^,]+;base64,/, "");
    const buf = Buffer.from(cleaned, "base64");
    console.log(
      `[NSFW Motion-RP materializer] ${tag} base64 decoded → ${buf.length} bytes; uploading to Blob/R2…`,
    );
    if (buf.length < 1024) {
      console.warn(`[NSFW Motion-RP materializer] ${tag} decoded buffer too small (${buf.length} bytes) — discarding`);
      return null;
    }
    const url = await uploadBufferToBlobOrR2(buf, "nsfw-video-motion", "mp4", "video/mp4");
    console.log(`[NSFW Motion-RP materializer] ${tag} uploaded → ${String(url || "").slice(0, 96)}`);
    return url || null;
  } catch (e) {
    console.warn(`[NSFW Motion-RP materializer] ${tag} base64 upload failed: ${e?.message || e}`);
    return null;
  }
}

/**
 * Manually reconcile a single stuck row: fetch /status from RunPod, run the
 * materializer, and update the generation row. Used by the admin rescue
 * endpoint (`POST /api/admin/runpod-motion/reconcile/:generationId`) and by
 * the webhook handler as a fallback when the inline payload was truncated.
 *
 * Returns `{ status, outputUrl?, message? }` where `status` is one of
 * "completed" | "still_running" | "failed" | "skipped".
 *
 * @param {{ id: string, providerTaskId: string | null, status: string, inputImageUrl?: string | null }} gen
 */
export async function forceReconcileRunpodMotionRow(gen) {
  if (!gen?.id) return { status: "skipped", message: "no generation row" };
  let runpodJobId = typeof gen.providerTaskId === "string" ? gen.providerTaskId.trim() : null;
  if (!runpodJobId) {
    try {
      const meta = JSON.parse(gen.inputImageUrl || "{}");
      if (typeof meta?.runpodJobId === "string") runpodJobId = meta.runpodJobId.trim();
    } catch { /* ignore */ }
  }
  if (!runpodJobId) {
    return { status: "skipped", message: "no runpodJobId on row (providerTaskId + meta both empty)" };
  }

  const rp = await pollNsfwMotionRunpodJob(runpodJobId);
  const raw = String(rp?.status || "").toLowerCase();
  const completed = ["completed", "success", "succeeded", "done", "complete", "finished", "ok"].includes(raw);
  const failed = ["failed", "error", "errored", "failure", "cancelled", "canceled", "timed_out", "timed-out"].includes(raw);

  if (failed) {
    const message =
      rp?.error ||
      rp?.output?.error ||
      (typeof rp?.output === "string" ? rp.output : null) ||
      `RunPod ${raw}`;
    return { status: "failed", message: String(message).slice(0, 400) };
  }

  if (!completed) {
    return { status: "still_running", message: `RunPod status: ${raw || "(unknown)"}` };
  }

  const outputUrl = await materializeNsfwMotionRunpodVideoOutput(rp, { generationId: gen.id });
  if (!outputUrl) {
    return {
      status: "failed",
      message: "RunPod COMPLETED but no usable video in payload (worker may have returned no output)",
    };
  }
  return { status: "completed", outputUrl };
}
