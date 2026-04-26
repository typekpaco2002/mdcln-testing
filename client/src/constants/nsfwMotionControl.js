/**
 * NSFW Motion Control — Wan 2.2 Animate on the dedicated RunPod worker.
 *
 * Single source of truth for the Create tab (Video → Recreate) and NSFW Studio copy.
 * Backend: POST /api/nsfw/generate-motion-video → submitNsfwMotionVideo (nsfw-motion.service.js).
 * Generation type: nsfw-video-motion
 */

/** Recreate engine value stored in video draft + sent with /generate/video-motion (other engines only). */
export const NSFW_MOTION_RUNPOD_ENGINE = "nsfw-motion";

/** Legacy draft/localStorage value — normalized on restore. */
export const NSFW_MOTION_RUNPOD_ENGINE_LEGACY = "motion-x";

/** Credits per second (aligned with MOTION_BASE_CREDITS_PER_SEC in nsfw.controller.js). */
export const NSFW_MOTION_CREDITS_PER_SEC = 30;

export const NSFW_MOTION_DISPLAY_NAME = "NSFW Motion Control";

export function normalizeNsfwMotionEngine(value) {
  if (value === NSFW_MOTION_RUNPOD_ENGINE_LEGACY) return NSFW_MOTION_RUNPOD_ENGINE;
  return value;
}

export function isNsfwMotionRunpodEngine(value) {
  return value === NSFW_MOTION_RUNPOD_ENGINE || value === NSFW_MOTION_RUNPOD_ENGINE_LEGACY;
}
