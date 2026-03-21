/**
 * RunPod serverless webhook — RunPod POSTs here when a job completes (optional; polling still works).
 * Configure: RUNPOD_WEBHOOK_URL=https://YOUR_DOMAIN/api/runpod/callback?secret=YOUR_SECRET
 *            RUNPOD_WEBHOOK_SECRET=YOUR_SECRET
 * @see https://docs.runpod.io/serverless/endpoints/webhooks
 */
import express from "express";
import prisma from "../lib/prisma.js";
import { normalizeRunpodNsfwOutput } from "../services/fal.service.js";
import { finalizeNsfwRunpodGeneration } from "../controllers/nsfw.controller.js";
import { refundGeneration } from "../services/credit.service.js";
import { getErrorMessageForDb } from "../lib/userError.js";

const router = express.Router();
const SECRET = process.env.RUNPOD_WEBHOOK_SECRET?.trim();

function verifyWebhook(req) {
  if (!SECRET) {
    if (process.env.NODE_ENV === "production") {
      console.error("[RunPod webhook] RUNPOD_WEBHOOK_SECRET is required in production");
      return false;
    }
    console.warn("[RunPod webhook] RUNPOD_WEBHOOK_SECRET unset — allowing callback (dev only)");
    return true;
  }
  const q = req.query?.secret ?? req.query?.token;
  const auth = req.headers.authorization;
  const bearer = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const header = req.headers["x-runpod-secret"];
  return q === SECRET || header === SECRET || bearer === SECRET;
}

async function findNsfwGenerationByRunpodJobId(jobId) {
  if (!jobId) return null;
  const rows = await prisma.generation.findMany({
    where: {
      type: "nsfw",
      status: { in: ["processing", "pending"] },
      createdAt: { gt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    },
    take: 200,
    orderBy: { createdAt: "desc" },
  });
  return (
    rows.find((g) => {
      try {
        const j = typeof g.inputImageUrl === "string" ? JSON.parse(g.inputImageUrl) : g.inputImageUrl;
        return j?.comfyuiPromptId === jobId;
      } catch {
        return false;
      }
    }) || null
  );
}

router.post("/callback", async (req, res) => {
  if (!verifyWebhook(req)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  try {
    const body = req.body || {};
    const jobId = body.id || body.requestId || body.jobId;
    const st = body.status;
    const rawOut = body.output;

    if (!jobId) {
      return res.status(200).json({ ok: false, reason: "no_job_id" });
    }

    const gen = await findNsfwGenerationByRunpodJobId(jobId);
    if (!gen) {
      console.warn(`[RunPod webhook] no processing generation for job ${jobId}`);
      return res.status(200).json({ ok: true, skipped: true, reason: "no_generation" });
    }

    if (st === "FAILED" || st === "CANCELLED") {
      const msg = rawOut?.error || body.error || "RunPod job failed";
      try {
        await refundGeneration(gen.id);
      } catch (e) {
        console.error("[RunPod webhook] refund:", e.message);
      }
      await prisma.generation.updateMany({
        where: { id: gen.id, status: { in: ["processing", "pending"] } },
        data: {
          status: "failed",
          errorMessage: getErrorMessageForDb(String(msg)),
          completedAt: new Date(),
        },
      });
      return res.status(200).json({ ok: true, failed: true });
    }

    if (st !== "COMPLETED") {
      return res.status(200).json({ ok: true, skipped: true, status: st });
    }

    const out = normalizeRunpodNsfwOutput(rawOut);
    if (!out?.images?.length) {
      console.warn(`[RunPod webhook] COMPLETED but no images for ${jobId}`);
      return res.status(200).json({ ok: true, skipped: true, reason: "no_images" });
    }

    await finalizeNsfwRunpodGeneration(gen.id, jobId, out);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[RunPod webhook]", e);
    // 200 so RunPod does not hammer retries; fix via polling / logs
    return res.status(200).json({ ok: false, error: e.message });
  }
});

export default router;
