/**
 * Designer Studio API — admin-only direct access to:
 * - Nano Banana Pro (image gen)
 * - Kling Image to Video 2.6 / 3.0
 * - Kling 2.6 / 3.0 Motion Control
 */
import express from "express";
import {
  generateTextToImageNanoBananaKie,
  generateImageWithNanoBananaKie,
  generateVideoWithKling26Kie,
  generateVideoWithMotionKie,
  getKieTaskStatus,
} from "../services/kie.service.js";

const router = express.Router();

/**
 * POST /api/designer-studio/nano-banana-pro
 * Body: { prompt, imageUrls?: string[], aspectRatio?, resolution?, model? }
 * If imageUrls provided (2+), identity-preserving; else text-to-image.
 */
router.post("/nano-banana-pro", async (req, res) => {
  try {
    const { prompt, imageUrls, aspectRatio = "1:1", resolution = "2K", model = "nano-banana-pro" } = req.body || {};
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ success: false, error: "prompt is required" });
    }
    const images = Array.isArray(imageUrls) ? imageUrls.filter(u => typeof u === "string" && u.startsWith("http")) : [];
    const result = images.length >= 2
      ? await generateImageWithNanoBananaKie(images, prompt.trim(), { aspectRatio, resolution, model, forcePolling: true })
      : await generateTextToImageNanoBananaKie(prompt.trim(), { aspectRatio, resolution, model, forcePolling: true });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error || "Generation failed" });
    }
    if (result.deferred && result.taskId) {
      return res.json({ success: true, deferred: true, taskId: result.taskId });
    }
    res.json({ success: true, outputUrl: result.outputUrl });
  } catch (err) {
    console.error("[designer-studio] nano-banana-pro error:", err?.message);
    res.status(500).json({ success: false, error: err?.message || "Server error" });
  }
});

/**
 * POST /api/designer-studio/kling-i2v
 * Body: { imageUrl, prompt, duration?, useKling3?, sound? }
 * useKling3: true = Kling 3.0 Image to Video
 */
router.post("/kling-i2v", async (req, res) => {
  try {
    const { imageUrl, prompt, duration = 5, useKling3 = false, sound = false } = req.body || {};
    if (!imageUrl || !prompt || typeof imageUrl !== "string" || typeof prompt !== "string") {
      return res.status(400).json({ success: false, error: "imageUrl and prompt are required" });
    }
    if (!imageUrl.startsWith("http")) {
      return res.status(400).json({ success: false, error: "imageUrl must be a valid HTTP(S) URL" });
    }
    const result = await generateVideoWithKling26Kie(imageUrl.trim(), prompt.trim(), {
      duration: String(duration),
      useKling3: useKling3 === true,
      sound: sound === true,
    });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error || "Video generation failed" });
    }
    if (result.deferred && result.taskId) {
      return res.json({ success: true, deferred: true, taskId: result.taskId });
    }
    res.json({ success: true, outputUrl: result.outputUrl });
  } catch (err) {
    console.error("[designer-studio] kling-i2v error:", err?.message);
    res.status(500).json({ success: false, error: err?.message || "Server error" });
  }
});

/**
 * POST /api/designer-studio/kling-motion
 * Body: { imageUrl, videoUrl, prompt?, ultra? }
 * ultra: true = Motion Control Pro+ tier. Returns taskId; poll GET /task/:taskId for result.
 */
router.post("/kling-motion", async (req, res) => {
  try {
    const { imageUrl, videoUrl, prompt, ultra = false } = req.body || {};
    if (!imageUrl || !videoUrl || typeof imageUrl !== "string" || typeof videoUrl !== "string") {
      return res.status(400).json({ success: false, error: "imageUrl and videoUrl are required" });
    }
    if (!imageUrl.startsWith("http") || !videoUrl.startsWith("http")) {
      return res.status(400).json({ success: false, error: "imageUrl and videoUrl must be valid HTTP(S) URLs" });
    }
    const result = await generateVideoWithMotionKie(imageUrl.trim(), videoUrl.trim(), {
      prompt: typeof prompt === "string" ? prompt.trim() : undefined,
      ultra: ultra === true,
    });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error || "Motion video failed" });
    }
    res.json({ success: true, deferred: true, taskId: result.taskId });
  } catch (err) {
    console.error("[designer-studio] kling-motion error:", err?.message);
    res.status(500).json({ success: false, error: err?.message || "Server error" });
  }
});

/**
 * GET /api/designer-studio/task/:taskId
 * Poll KIE task status (for deferred kling-motion or any task).
 */
router.get("/task/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) return res.status(400).json({ success: false, error: "taskId required" });
    const status = await getKieTaskStatus(taskId);
    res.json({ success: true, ...status });
  } catch (err) {
    console.error("[designer-studio] task status error:", err?.message);
    res.status(500).json({ success: false, error: err?.message || "Server error" });
  }
});

export default router;
