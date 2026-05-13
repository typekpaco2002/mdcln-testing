import prisma from "../lib/prisma.js";

/** Statuses treated as terminal for in-flight job counting. */
const TERMINAL = new Set([
  "completed",
  "failed",
  "cancelled",
  "deleted",
]);

/**
 * Rows staged but not yet executing upstream work (e.g. nudes-pack Grok prompts before RunPod).
 * Counting them toward the cap blocked legitimate multi-row packs (~26 poses) behind default 12.
 */
const STAGING_ONLY = new Set(["queued"]);

function parseMaxInFlight() {
  const raw = process.env.GENERATION_MAX_IN_FLIGHT_PER_USER;
  if (raw === "0" || raw === "") return Infinity;
  const n = parseInt(raw || "48", 10);
  if (!Number.isFinite(n) || n < 1) return 48;
  return Math.min(n, 200);
}

const MAX = parseMaxInFlight();

/**
 * After auth. Blocks new heavy jobs while the account already has MAX rows that are actively
 * or imminently consuming pipeline capacity (`processing`, `pending`, etc.).
 * Does **not** count `queued` staging rows (batch packs / scripts fan-out).
 */
export async function generationConcurrencyMiddleware(req, res, next) {
  try {
    if (MAX === Infinity) return next();

    const userId = req.user?.userId;
    if (!userId) return next();

    const excluded = [...TERMINAL, ...STAGING_ONLY];
    const active = await prisma.generation.count({
      where: {
        userId,
        status: { notIn: excluded },
      },
    });

    if (active >= MAX) {
      return res.status(429).json({
        success: false,
        code: "GENERATION_QUEUE_FULL",
        message: `Too many jobs in progress for your account (${active}/${MAX}). Wait for completions or failures, or raise TEMPORARILY with support.`,
      });
    }
    return next();
  } catch (err) {
    console.warn("[generationConcurrency] COUNT failed → fail-open:", err?.message || err);
    return next();
  }
}
