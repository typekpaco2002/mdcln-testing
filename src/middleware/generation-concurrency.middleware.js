import prisma from "../lib/prisma.js";

/** Statuses treated as terminal for in-flight job counting. */
const TERMINAL = new Set([
  "completed",
  "failed",
  "cancelled",
  "deleted",
]);

function parseMaxInFlight() {
  const raw = process.env.GENERATION_MAX_IN_FLIGHT_PER_USER;
  if (raw === "0" || raw === "") return Infinity;
  const n = parseInt(raw || "12", 10);
  if (!Number.isFinite(n) || n < 1) return 12;
  return Math.min(n, 200);
}

const MAX = parseMaxInFlight();

/**
 * After auth. Blocks new heavy jobs while the account already has MAX non-terminal Generation rows.
 * Best-effort (Prisma COUNT); separates later dedicated API infra from web traffic.
 */
export async function generationConcurrencyMiddleware(req, res, next) {
  try {
    if (MAX === Infinity) return next();

    const userId = req.user?.userId;
    if (!userId) return next();

    const active = await prisma.generation.count({
      where: {
        userId,
        status: { notIn: Array.from(TERMINAL) },
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
