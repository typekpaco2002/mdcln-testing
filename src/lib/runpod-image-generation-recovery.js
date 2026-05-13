import prisma from "./prisma.js";
import { getErrorMessageForDb } from "./userError.js";
import {
  resolveRunpodPollCanonicalStatus,
  isRunpodPollCompleted,
  isRunpodPollFailedOrCancelled,
} from "./runpod-job-status.js";
import { pollModelCloneXJob, extractModelCloneXImages } from "../services/modelcloneX.service.js";
import { pollUpscalerJob, extractUpscalerImage } from "../services/upscaler.service.js";
import { uploadBufferToBlobOrR2, isVercelBlobConfigured } from "../utils/kieUpload.js";
import { isR2Configured } from "../utils/r2.js";
import { refundGeneration } from "../services/credit.service.js";

const RUNPOD_IMAGE_TYPES = new Set(["modelclone-x", "soulx", "nsfw", "upscale"]);

function resolveRunpodJobIdFromGeneration(gen) {
  let runpodJobId = typeof gen.providerTaskId === "string" ? gen.providerTaskId.trim() : "";
  if (!runpodJobId && gen.inputImageUrl) {
    try {
      const meta = JSON.parse(gen.inputImageUrl);
      runpodJobId =
        (typeof meta?.runningHubTaskId === "string" && meta.runningHubTaskId.trim()) ||
        (typeof meta?.runpodJobId === "string" && meta.runpodJobId.trim()) ||
        "";
    } catch {
      /* ignore */
    }
  }
  return runpodJobId || null;
}

async function enqueueCleanupMaybe(userId, modelId) {
  if (!userId || !modelId) return;
  try {
    const { enqueueCleanupOldGenerations } = await import("../controllers/generation.controller.js");
    enqueueCleanupOldGenerations(userId, modelId);
  } catch {
    /* ignore */
  }
}

/**
 * Poll RunPod once and persist terminal state — used when webhooks were missed (same logic as RunPod watchdog).
 *
 * @param {object} gen - Generation row (needs id, type, status, providerTaskId?, inputImageUrl?, modelId?)
 * @param {object} select - Prisma select object for reload
 * @param {string} userId - Owner (defense in depth)
 * @returns {Promise<object|null>} Fresh row after update, or null if unchanged / not applicable
 */
export async function attemptRecoverRunpodImageGeneration(gen, select, userId) {
  if (!gen || gen.status !== "processing" || !RUNPOD_IMAGE_TYPES.has(gen.type)) {
    return null;
  }
  const runpodJobId = resolveRunpodJobIdFromGeneration(gen);
  if (!runpodJobId) return null;

  let rp;
  try {
    rp = gen.type === "upscale" ? await pollUpscalerJob(runpodJobId) : await pollModelCloneXJob(runpodJobId);
  } catch (e) {
    console.warn(`[RunPod recover] poll failed ${gen.id?.slice(0, 8)}: ${e?.message || e}`);
    return null;
  }

  const output = rp?.output !== undefined && rp.output !== null ? rp.output : rp;
  const canon = resolveRunpodPollCanonicalStatus(rp, () => {
    if (gen.type === "upscale") return !!extractUpscalerImage(output);
    return extractModelCloneXImages(output).length > 0;
  });

  if (isRunpodPollFailedOrCancelled(canon)) {
    const errMsg =
      (typeof rp?.error === "string" && rp.error) ||
      (typeof rp?.errorMessage === "string" && rp.errorMessage) ||
      (typeof rp?.output?.error === "string" && rp.output.error) ||
      "Generation failed on RunPod";
    await refundGeneration(gen.id).catch(() => {});
    await prisma.generation.update({
      where: { id: gen.id, userId },
      data: {
        status: "failed",
        errorMessage: getErrorMessageForDb(String(errMsg).slice(0, 500)),
        completedAt: new Date(),
      },
    });
    return prisma.generation.findFirst({ where: { id: gen.id, userId }, select });
  }

  if (!isRunpodPollCompleted(canon)) return null;

  let imagePayloads = [];
  if (gen.type === "upscale") {
    const one = extractUpscalerImage(rp);
    imagePayloads = one ? [one] : [];
  } else {
    const imgs = extractModelCloneXImages(output);
    imagePayloads = Array.isArray(imgs) ? imgs.filter(Boolean) : [];
  }

  if (!imagePayloads.length) {
    await refundGeneration(gen.id).catch(() => {});
    await prisma.generation.update({
      where: { id: gen.id, userId },
      data: {
        status: "failed",
        errorMessage: getErrorMessageForDb("RunPod completed but returned no image"),
        completedAt: new Date(),
      },
    });
    return prisma.generation.findFirst({ where: { id: gen.id, userId }, select });
  }

  const canUpload = isVercelBlobConfigured() || isR2Configured();
  const outputUrls = [];
  for (const imageData of imagePayloads) {
    if (typeof imageData === "string" && imageData.startsWith("http")) {
      outputUrls.push(imageData);
    } else if (typeof imageData === "string") {
      if (canUpload) {
        const buf = Buffer.from(imageData, "base64");
        const uploaded = await uploadBufferToBlobOrR2(
          buf,
          gen.type === "upscale" ? "upscale" : gen.type === "nsfw" ? "nsfw" : "modelclone-x",
          "png",
          "image/png",
        );
        outputUrls.push(uploaded);
      } else {
        outputUrls.push(`data:image/png;base64,${imageData}`);
      }
    }
  }

  const outputUrl = outputUrls.length === 1 ? outputUrls[0] : JSON.stringify(outputUrls);
  await prisma.generation.update({
    where: { id: gen.id, userId },
    data: { status: "completed", outputUrl, completedAt: new Date(), errorMessage: null },
  });
  await enqueueCleanupMaybe(userId, gen.modelId);
  console.log(`✅ [RunPod recover] ${gen.type} gen ${gen.id} updated from poll`);

  return prisma.generation.findFirst({ where: { id: gen.id, userId }, select });
}
