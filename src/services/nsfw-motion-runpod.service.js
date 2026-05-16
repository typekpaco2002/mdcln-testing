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
 * /run body cap) and patches nodes 167 (reference image) and 52 (driving video)
 * server-side. Output node 226 (VHS_VideoCombine) returns base64 mp4.
 *
 * @see runpod-mdcln-motion/handler.py
 * @see runpod-mdcln-motion/workflow_api.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { uploadBufferToBlobOrR2 } from "../utils/kieUpload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_MOTION_ENDPOINT_ID = (process.env.RUNPOD_MOTION_ENDPOINT_ID || "").trim() || null;
const MOTION_OUTPUT_NODE = "226"; // VHS_VideoCombine in workflow_api.json

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

  return {
    prompt: wf,
    reference_image_url: args.referenceImageUrl,
    driving_video_url: args.drivingVideoUrl,
    output_node_id: MOTION_OUTPUT_NODE,
    output_type: "video",
    seed,
  };
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
    const timer = setTimeout(() => controller.abort(), 25_000);
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
 *   { output: { status: "COMPLETED", videos: [{ base64, filename, ... }] } }
 *
 * Tolerates a few legacy shapes:
 *   - top-level (no `output` wrapper)
 *   - `output.outputs["226"].videos[]` (node-keyed)
 *   - `images[]` fallback if a workflow tweak produced still frames
 *
 * Returns a public https URL (uploads base64 to Blob/R2). Returns null when
 * nothing usable was found — callers should mark the row failed and refund.
 *
 * @param {unknown} rp
 * @returns {Promise<string | null>}
 */
export async function materializeNsfwMotionRunpodVideoOutput(rp) {
  if (!rp || typeof rp !== "object") return null;
  const out = rp.output !== undefined && rp.output !== null ? rp.output : rp;

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
  // Image fallback (worker still returns images[] if no video node produced output)
  if (!pick) pick = pickVideoFromArray(out?.images);

  if (!pick) {
    if (typeof out === "string" && out.length > 200) {
      pick = { kind: isHttpUrlLike(out) ? "url" : "base64", value: out };
    }
  }

  if (!pick) return null;

  if (pick.kind === "url") return pick.value;

  try {
    const cleaned = pick.value.replace(/^data:[^,]+;base64,/, "");
    const buf = Buffer.from(cleaned, "base64");
    if (buf.length < 1024) {
      console.warn(`[NSFW Motion-RP] decoded buffer too small (${buf.length} bytes) — discarding`);
      return null;
    }
    const url = await uploadBufferToBlobOrR2(buf, "nsfw-video-motion", "mp4", "video/mp4");
    return url || null;
  } catch (e) {
    console.warn("[NSFW Motion-RP] base64 upload failed:", e?.message || e);
    return null;
  }
}
