/**
 * GPT-X routes — AI generation assistant with chat UI.
 * Grok (via OpenRouter) interprets the user's request and enhances the prompt.
 * The frontend then calls the appropriate generation endpoint and associates
 * the resulting generationId back via PATCH /api/gptx/messages/:id.
 */

import express from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

const GPTX_MODEL =
  process.env.GPTX_PROMPT_MODEL ||
  process.env.MODELCLONE_X_PROMPT_MODEL ||
  process.env.SOULX_PROMPT_MODEL ||
  "x-ai/grok-4";

const GPTX_TIMEOUT_MS = 20000;

// ─── Grok prompt enhancer ────────────────────────────────────────────────────

async function enhanceWithGrok({ userMessage, modelName, isNsfw, referenceImageUrl }) {
  const systemPrompt = [
    "You are an AI image generation assistant for a creator platform.",
    "Given the user's natural-language request, return ONLY a valid JSON object (no markdown, no code fences) with these keys:",
    '  "enhancedPrompt": string — a detailed, vivid, optimized image generation prompt derived from the user request.',
    '  "aspectRatio": string — best fit from ["9:16","16:9","1:1","3:4","4:3"]. Default "9:16" for portraits/people.',
    '  "title": string — short conversation title, max 5 words.',
    `The user's chosen AI model is "${modelName || "an AI avatar model"}".`,
    `NSFW content: ${isNsfw ? "allowed — be explicit and detailed when requested" : "not allowed — keep output safe for work"}.`,
    referenceImageUrl
      ? "A reference image has been provided; use it as style/pose/scene context in the enhanced prompt."
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: GPTX_MODEL,
      messages,
      max_tokens: 600,
      temperature: 0.75,
    }),
    signal: AbortSignal.timeout(GPTX_TIMEOUT_MS),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Grok API error (${resp.status}): ${txt.slice(0, 300)}`);
  }

  const data = await resp.json();
  const raw = data?.choices?.[0]?.message?.content || "";

  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      enhancedPrompt: String(parsed.enhancedPrompt || userMessage),
      aspectRatio: String(parsed.aspectRatio || "9:16"),
      title: String(parsed.title || userMessage).slice(0, 60),
    };
  } catch {
    // Graceful fallback if Grok doesn't return valid JSON
    return {
      enhancedPrompt: userMessage,
      aspectRatio: "9:16",
      title: userMessage.slice(0, 60),
    };
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/gptx/conversations — list user's conversations
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const conversations = await prisma.gptxConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true, createdAt: true },
      take: 50,
    });
    res.json({ success: true, conversations });
  } catch (err) {
    console.error("❌ GPTX list conversations error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/gptx/conversations — create a blank conversation
router.post("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const conv = await prisma.gptxConversation.create({
      data: { userId, title: "New Chat" },
    });
    res.json({ success: true, conversation: conv });
  } catch (err) {
    console.error("❌ GPTX create conversation error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/gptx/conversations/:id — get conversation with all messages
router.get("/conversations/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const conv = await prisma.gptxConversation.findFirst({
      where: { id: req.params.id, userId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });
    res.json({ success: true, conversation: conv });
  } catch (err) {
    console.error("❌ GPTX get conversation error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/gptx/conversations/:id
router.delete("/conversations/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    await prisma.gptxConversation.deleteMany({
      where: { id: req.params.id, userId },
    });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ GPTX delete conversation error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/gptx/send — main: Grok enhances prompt, saves messages, returns generation params
// Body: { message, conversationId?, modelId, modelName, isNsfw, referenceImageUrl? }
router.post("/send", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { message, conversationId, modelId, modelName, isNsfw, referenceImageUrl } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    // Enhance prompt with Grok
    let enhancedPrompt = message;
    let aspectRatio = "9:16";
    let title = message.slice(0, 60);

    try {
      const result = await enhanceWithGrok({
        userMessage: message.trim(),
        modelName,
        isNsfw: Boolean(isNsfw),
        referenceImageUrl,
      });
      enhancedPrompt = result.enhancedPrompt;
      aspectRatio = result.aspectRatio;
      title = result.title;
    } catch (grokErr) {
      console.warn("⚠️ GPTX Grok enhancement failed, using raw message:", grokErr.message);
    }

    // Get or create conversation
    let conv = null;
    if (conversationId) {
      conv = await prisma.gptxConversation.findFirst({
        where: { id: conversationId, userId },
      });
    }

    if (!conv) {
      conv = await prisma.gptxConversation.create({
        data: { userId, title },
      });
    } else if (conv.title === "New Chat") {
      conv = await prisma.gptxConversation.update({
        where: { id: conv.id },
        data: { title, updatedAt: new Date() },
      });
    } else {
      await prisma.gptxConversation.update({
        where: { id: conv.id },
        data: { updatedAt: new Date() },
      });
    }

    // Save user message
    const userMsg = await prisma.gptxMessage.create({
      data: {
        conversationId: conv.id,
        role: "user",
        content: message.trim(),
      },
    });

    // Save pending assistant placeholder (generationId attached later via PATCH)
    const aiMsg = await prisma.gptxMessage.create({
      data: {
        conversationId: conv.id,
        role: "assistant",
        content: "",
      },
    });

    res.json({
      success: true,
      conversationId: conv.id,
      userMessageId: userMsg.id,
      aiMessageId: aiMsg.id,
      enhancedPrompt,
      aspectRatio,
      title,
      modelId: modelId || null,
      isNsfw: Boolean(isNsfw),
    });
  } catch (err) {
    console.error("❌ GPTX send error:", err);
    res.status(500).json({ success: false, message: err.message || "Server error" });
  }
});

// PATCH /api/gptx/messages/:id — attach generationId / videoGenId after generation is triggered
// Body: { generationId?, videoGenId?, content? }
router.patch("/messages/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { generationId, videoGenId, content } = req.body;

    // Verify ownership
    const msg = await prisma.gptxMessage.findFirst({
      where: { id: req.params.id },
      include: { conversation: { select: { userId: true } } },
    });
    if (!msg || msg.conversation.userId !== userId) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const data = {};
    if (generationId !== undefined) data.generationId = generationId;
    if (videoGenId !== undefined) data.videoGenId = videoGenId;
    if (content !== undefined) data.content = content;

    const updated = await prisma.gptxMessage.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, message: updated });
  } catch (err) {
    console.error("❌ GPTX patch message error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
