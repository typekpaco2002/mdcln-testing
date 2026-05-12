import prisma from "../lib/prisma.js";

/** Public API v1 stable envelope (HTTP integrations — keep backward compatible once published). */

export async function getV1Health(req, res) {
  res.set("Cache-Control", "no-store");
  res.json({
    ok: true,
    apiVersion: 1,
    service: "modelclone-public-api",
    documentationYaml: `${req.protocol}://${req.get("host")}/api/v1/openapi.yaml`,
    note:
      "Authenticated requests: X-Api-Key or Authorization: Bearer mcl_… Same account as the web app. Full REST parity: use /api/v1/... with the same paths as /api/... except Flow Studio (remain on /api/flows only).",
  });
}

/** Integration-safe profile — no Stripe customer IDs or password hints. */
export async function getV1Me(req, res) {
  try {
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        code: "unauthorized",
        message: "Authentication required",
      });
    }

    const { checkAndExpireCredits } = await import("../services/credit.service.js");
    try {
      await checkAndExpireCredits(userId);
    } catch (_) {
      // non-fatal
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        credits: true,
        subscriptionCredits: true,
        purchasedCredits: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        isVerified: true,
        onboardingCompleted: true,
        premiumFeaturesUnlocked: true,
        proAccess: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: "not_found",
        message: "User not found",
      });
    }

    const credits = Number(user.credits ?? 0) || 0;
    const subscriptionCredits = Number(user.subscriptionCredits ?? 0) || 0;
    const purchasedCredits = Number(user.purchasedCredits ?? 0) || 0;
    const totalCredits = credits + subscriptionCredits + purchasedCredits;

    res.json({
      success: true,
      apiVersion: 1,
      data: {
        user: {
          ...user,
          credits,
          subscriptionCredits,
          purchasedCredits,
          totalCredits,
        },
        authVia: req.user?.authViaApiKey ? "api_key" : "session",
      },
    });
  } catch (err) {
    console.error("[v1/me]", err?.message ?? err);
    res.status(500).json({
      success: false,
      code: "internal_error",
      message: "Server error",
    });
  }
}
