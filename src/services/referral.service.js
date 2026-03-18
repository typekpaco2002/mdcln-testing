import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";

export const REFERRAL_MIN_PAYOUT_CENTS = 10000; // $100.00
const REFERRAL_COMMISSION_BPS = 1500; // 15%
const REFERRAL_CAPTURE_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFERRAL_IP_MATCH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const REFERRAL_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const REFERRAL_COOKIE_NAME = "referral_attribution";
const RESERVED_REFERRAL_SUFFIXES = new Set([
  "admin",
  "api",
  "auth",
  "login",
  "signup",
  "dashboard",
  "settings",
  "billing",
  "pricing",
  "privacy",
  "terms",
  "support",
  "help",
  "contact",
  "about",
  "status",
  "www",
  "app",
  "root",
  "referral",
  "referrals",
  "affiliate",
  "withdraw",
  "payout",
]);

export function isReservedReferralCode(code) {
  if (typeof code !== "string" || !code.trim()) return false;
  return RESERVED_REFERRAL_SUFFIXES.has(code.trim().toLowerCase());
}

export function normalizeReferralCode(input) {
  if (typeof input !== "string") return null;
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.length < 4 || normalized.length > 30) return null;
  if (!/^[a-z0-9_-]+$/.test(normalized)) return null;
  if (isReservedReferralCode(normalized)) return null;
  return normalized;
}

export function isValidSolanaAddress(address) {
  if (typeof address !== "string") return false;
  const trimmed = address.trim();
  // Solana base58 public key (typically 32-44 chars)
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed);
}

export function getReferralCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: REFERRAL_COOKIE_MAX_AGE_MS,
    path: "/",
  };
}

export function signReferralCaptureToken({ draftId, referralCode, referrerUserId }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required to sign referral capture token");
  return jwt.sign(
    {
      type: "referral_capture",
      draftId,
      referralCode,
      referrerUserId,
    },
    secret,
    { expiresIn: "30d" },
  );
}

function verifyReferralCaptureToken(token) {
  if (!token || typeof token !== "string") return null;
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const decoded = jwt.verify(token, secret);
    if (decoded?.type !== "referral_capture") return null;
    return {
      draftId: typeof decoded?.draftId === "string" ? decoded.draftId : null,
      referralCode: normalizeReferralCode(decoded?.referralCode),
      referrerUserId:
        typeof decoded?.referrerUserId === "string"
          ? decoded.referrerUserId
          : null,
    };
  } catch {
    return null;
  }
}

function summarizeReferrerCandidates(candidates) {
  const map = new Map();
  for (const candidate of candidates || []) {
    if (!candidate?.referrerUserId) continue;
    const existing = map.get(candidate.referrerUserId) || {
      referrerUserId: candidate.referrerUserId,
      referralCode: candidate.referralCode,
      draftCount: 0,
      latestAt: candidate.createdAt,
      strongestSignal: "ip",
      draftIds: [],
    };
    existing.draftCount += 1;
    if (!existing.latestAt || candidate.createdAt > existing.latestAt) {
      existing.latestAt = candidate.createdAt;
    }
    if (candidate.signalStrength === "fingerprint") {
      existing.strongestSignal = "fingerprint";
    }
    if (candidate.id) existing.draftIds.push(candidate.id);
    map.set(candidate.referrerUserId, existing);
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.strongestSignal !== b.strongestSignal) {
      return a.strongestSignal === "fingerprint" ? -1 : 1;
    }
    if (a.draftCount !== b.draftCount) return b.draftCount - a.draftCount;
    return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
  });
}

function getReferralDraftDelegate(db = prisma) {
  return db?.loggedReferralSignupDraft || null;
}

function buildCaptureEmailTag(referralCode) {
  return `__refcap__:${referralCode}`;
}

function parseCaptureEmailTag(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text.startsWith("__refcap__:")) return null;
  return normalizeReferralCode(text.replace("__refcap__:", ""));
}

export async function attachReferrerToUser(userId, referralCode) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, referredByUserId: true },
  });
  if (!user || user.referredByUserId) return { linked: false };

  const normalizedCode = normalizeReferralCode(referralCode);
  if (normalizedCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: normalizedCode },
      select: { id: true },
    });
    if (referrer && referrer.id !== user.id) {
      await prisma.user.update({
        where: { id: userId },
        data: { referredByUserId: referrer.id },
      });
      return { linked: true, referrerUserId: referrer.id, method: "code" };
    }
  }
  return { linked: false };
}

const REFERRAL_CHECKOUT_DISCOUNT_PERCENT = 5;

/**
 * Validates a referral code for use at checkout. Only valid for first-ever purchase:
 * - Code must belong to another user (not self).
 * - Buyer must have no prior paid transaction (no CreditTransaction with paymentSessionId).
 * - Buyer must not already be linked (referredByUserId is null).
 * Returns { valid: true, referrerUserId, discountPercent: 5 } or { valid: false, message }.
 */
export async function validateReferralCodeForCheckout(userId, referralCode) {
  const normalizedCode = normalizeReferralCode(referralCode);
  if (!normalizedCode) {
    return { valid: false, message: "Invalid referral code format." };
  }

  const [buyer, referrer, priorPaymentTx] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referredByUserId: true },
    }),
    prisma.user.findUnique({
      where: { referralCode: normalizedCode },
      select: { id: true },
    }),
    prisma.creditTransaction.findFirst({
      where: { userId, type: "purchase", paymentSessionId: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { id: true, paymentSessionId: true },
    }),
  ]);

  const isRealPaywallSessionId = (value) => {
    const sid = String(value || "").trim();
    if (!sid) return false;
    return (
      sid.startsWith("cs_") ||
      sid.startsWith("pi_") ||
      sid.startsWith("in_") ||
      sid.startsWith("sub_") ||
      sid.startsWith("crypto_")
    );
  };
  const hasPriorRealPaywallPurchase =
    !!priorPaymentTx &&
    isRealPaywallSessionId(priorPaymentTx.paymentSessionId);

  if (!buyer) return { valid: false, message: "User not found." };
  if (!referrer) return { valid: false, message: "Referral code not found." };
  if (referrer.id === buyer.id) return { valid: false, message: "You cannot use your own referral code." };
  if (buyer.referredByUserId) return { valid: false, message: "Your account is already linked to a referrer." };
  if (hasPriorRealPaywallPurchase) {
    return { valid: false, message: "Referral discount is only valid on your first purchase." };
  }

  return {
    valid: true,
    referrerUserId: referrer.id,
    discountPercent: REFERRAL_CHECKOUT_DISCOUNT_PERCENT,
  };
}

export function getReferralDiscountPercent() {
  return REFERRAL_CHECKOUT_DISCOUNT_PERCENT;
}

/**
 * Persist a referral attribution hint keyed by IP/device fingerprint.
 * This allows linking when signup happens in a different tab/session/browser.
 */
export async function recordReferralCaptureHint({
  referralCode,
  ipAddress,
  deviceFingerprint,
  userAgent,
}) {
  const normalizedCode = normalizeReferralCode(referralCode);
  if (!normalizedCode) return { recorded: false };

  const referrer = await prisma.user.findUnique({
    where: { referralCode: normalizedCode },
    select: { id: true },
  });
  if (!referrer) return { recorded: false };

  const safeIp = String(ipAddress || "").trim().slice(0, 255) || null;
  const safeFingerprint = String(deviceFingerprint || "").trim().slice(0, 255) || null;
  const safeUserAgent = String(userAgent || "Unknown").slice(0, 512);

  const draftDelegate = getReferralDraftDelegate(prisma);
  let createdDraft = null;

  if (draftDelegate) {
    createdDraft = await draftDelegate.create({
      data: {
        referralCode: normalizedCode,
        referrerUserId: referrer.id,
        ipAddress: safeIp,
        deviceFingerprint: safeFingerprint,
        userAgent: safeUserAgent,
        signup: false,
      },
      select: {
        id: true,
        referralCode: true,
        referrerUserId: true,
      },
    });
  } else {
    // Fallback for environments where Prisma client was not regenerated yet.
    await prisma.signupFingerprint.create({
      data: {
        ipAddress: safeIp || "unknown",
        deviceFingerprint: safeFingerprint || "no-fingerprint-available",
        userAgent: `referral-capture|${safeUserAgent}`,
        email: buildCaptureEmailTag(normalizedCode),
        freeCreditsGiven: false,
      },
    });
  }

  return {
    recorded: true,
    referralCode: normalizedCode,
    referrerUserId: referrer.id,
    draftId: createdDraft?.id || null,
  };
}

/**
 * Deterministic signup matching priority:
 * 1) explicit referral code (highest confidence)
 * 2) signed referral cookie token (high confidence)
 * 3) fingerprint-only draft match (medium confidence)
 * 4) strict IP-only match with anti-collision guards (low confidence)
 */
export async function resolveReferralMatchForSignup({
  explicitReferralCode,
  signedReferralToken,
  ipAddress,
  deviceFingerprint,
  signupUserId,
  signupEmail,
}) {
  const normalizedExplicit = normalizeReferralCode(explicitReferralCode);
  if (normalizedExplicit) {
    return {
      referralCode: normalizedExplicit,
      status: "matched",
      method: "explicit_code",
      confidence: "high",
      clearCookie: false,
      candidates: [],
    };
  }

  const draftDelegate = getReferralDraftDelegate(prisma);
  const decodedToken = verifyReferralCaptureToken(signedReferralToken);
  if (draftDelegate && decodedToken?.draftId && decodedToken?.referralCode && decodedToken?.referrerUserId) {
    const tokenDraft = await draftDelegate.findFirst({
      where: {
        id: decodedToken.draftId,
        signup: false,
        referralCode: decodedToken.referralCode,
        referrerUserId: decodedToken.referrerUserId,
        createdAt: { gte: new Date(Date.now() - REFERRAL_CAPTURE_LOOKBACK_MS) },
      },
      select: {
        id: true,
        referralCode: true,
      },
    });

    if (tokenDraft) {
      if (signupUserId) {
        await draftDelegate.updateMany({
          where: { id: tokenDraft.id, signup: false },
          data: {
            signup: true,
            signedUpUserId: signupUserId,
            matchedAt: new Date(),
          },
        });
      }
      return {
        referralCode: normalizeReferralCode(tokenDraft.referralCode),
        status: "matched",
        method: "signed_cookie",
        confidence: "high",
        matchedDraftId: tokenDraft.id,
        clearCookie: true,
        candidates: [],
      };
    }
  }
  if (!draftDelegate && decodedToken?.referralCode) {
    return {
      referralCode: decodedToken.referralCode,
      status: "matched",
      method: "signed_cookie",
      confidence: "high",
      clearCookie: true,
      candidates: [],
    };
  }

  const safeIp = String(ipAddress || "").trim() || null;
  const safeFingerprint = String(deviceFingerprint || "").trim() || null;
  if (!safeIp && !safeFingerprint) {
    return {
      referralCode: null,
      status: "none",
      method: "none",
      confidence: "none",
      clearCookie: true,
      candidates: [],
    };
  }

  const now = Date.now();
  if (!draftDelegate) {
    const fallbackRows = await prisma.signupFingerprint.findMany({
      where: {
        createdAt: { gte: new Date(now - REFERRAL_CAPTURE_LOOKBACK_MS) },
        email: { startsWith: "__refcap__:" },
        OR: [
          ...(safeIp ? [{ ipAddress: safeIp }] : []),
          ...(safeFingerprint ? [{ deviceFingerprint: safeFingerprint }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { email: true },
    });
    for (const row of fallbackRows) {
      const code = parseCaptureEmailTag(row.email);
      if (code) {
        return {
          referralCode: code,
          status: "matched",
          method: "fingerprint",
          confidence: "medium",
          clearCookie: true,
          candidates: [],
        };
      }
    }
    return {
      referralCode: null,
      status: "none",
      method: "none",
      confidence: "none",
      clearCookie: true,
      candidates: [],
    };
  }

  const fingerprintCandidates = safeFingerprint
    ? await draftDelegate.findMany({
        where: {
          signup: false,
          deviceFingerprint: safeFingerprint,
          createdAt: { gte: new Date(now - REFERRAL_CAPTURE_LOOKBACK_MS) },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          referralCode: true,
          referrerUserId: true,
          createdAt: true,
        },
      })
    : [];

  if (fingerprintCandidates.length > 0) {
    const summarized = summarizeReferrerCandidates(
      fingerprintCandidates.map((c) => ({ ...c, signalStrength: "fingerprint" })),
    );
    if (summarized.length === 1) {
      const winningDraft = fingerprintCandidates[0];
      if (signupUserId) {
        await draftDelegate.updateMany({
          where: { id: winningDraft.id, signup: false },
          data: {
            signup: true,
            signedUpUserId: signupUserId,
            matchedAt: new Date(),
          },
        });
      }
      return {
        referralCode: normalizeReferralCode(winningDraft.referralCode),
        status: "matched",
        method: "fingerprint",
        confidence: "medium",
        matchedDraftId: winningDraft.id,
        clearCookie: true,
        candidates: summarized,
      };
    }

    return {
      referralCode: null,
      status: "ambiguous",
      method: "fingerprint",
      confidence: "low",
      reason: "multiple_referrers_same_fingerprint",
      clearCookie: true,
      candidates: summarized,
      signupUserId,
      signupEmail,
    };
  }

  const ipCandidates = safeIp
    ? await draftDelegate.findMany({
        where: {
          signup: false,
          ipAddress: safeIp,
          createdAt: { gte: new Date(now - REFERRAL_IP_MATCH_WINDOW_MS) },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          referralCode: true,
          referrerUserId: true,
          createdAt: true,
        },
      })
    : [];

  if (ipCandidates.length === 0) {
    return {
      referralCode: null,
      status: "none",
      method: "none",
      confidence: "none",
      clearCookie: true,
      candidates: [],
    };
  }

  const ipSummarized = summarizeReferrerCandidates(
    ipCandidates.map((c) => ({ ...c, signalStrength: "ip" })),
  );

  // Anti-collision safeguard:
  // never auto-assign on IP if multiple referrers have captured this IP.
  if (ipSummarized.length > 1) {
    return {
      referralCode: null,
      status: "ambiguous",
      method: "ip",
      confidence: "low",
      reason: "multiple_referrers_same_ip",
      clearCookie: true,
      candidates: ipSummarized,
      signupUserId,
      signupEmail,
    };
  }

  // Secondary anti-collision: if one referrer but too many drafts on same IP, flag review.
  if (ipCandidates.length > 3) {
    return {
      referralCode: null,
      status: "blocked",
      method: "ip",
      confidence: "low",
      reason: "ip_signal_too_noisy",
      clearCookie: true,
      candidates: ipSummarized,
      signupUserId,
      signupEmail,
    };
  }

  const winningIpDraft = ipCandidates[0];
  if (signupUserId) {
    await draftDelegate.updateMany({
      where: { id: winningIpDraft.id, signup: false },
      data: {
        signup: true,
        signedUpUserId: signupUserId,
        matchedAt: new Date(),
      },
    });
  }

  return {
    referralCode: normalizeReferralCode(winningIpDraft.referralCode),
    status: "matched",
    method: "ip",
    confidence: "low",
    matchedDraftId: winningIpDraft.id,
    clearCookie: true,
    candidates: ipSummarized,
  };
}

// Backward-compat wrapper
export async function resolveReferralCodeForSignup(args) {
  const result = await resolveReferralMatchForSignup(args);
  return result?.referralCode || null;
}

export async function getReferralReconciliationItems(limit = 100) {
  const safeLimit = Math.max(1, Math.min(300, Number(limit) || 100));
  const now = Date.now();
  const since = new Date(now - REFERRAL_CAPTURE_LOOKBACK_MS);

  const users = await prisma.user.findMany({
    where: {
      referredByUserId: null,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: safeLimit,
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  const items = [];
  const draftDelegate = getReferralDraftDelegate(prisma);
  if (!draftDelegate) {
    return {
      success: true,
      items: [],
    };
  }
  for (const user of users) {
    try {
      const fingerprintRow = await prisma.signupFingerprint.findFirst({
        where: { email: user.email },
        orderBy: { createdAt: "desc" },
        select: {
          ipAddress: true,
          deviceFingerprint: true,
        },
      });
      if (!fingerprintRow) continue;

      const userIp = String(fingerprintRow.ipAddress || "").trim();
      const userFp = String(fingerprintRow.deviceFingerprint || "").trim();
      if (!userIp && !userFp) continue;

      const orClauses = [
        ...(userFp ? [{ deviceFingerprint: userFp }] : []),
        ...(userIp ? [{ ipAddress: userIp }] : []),
      ];
      if (!orClauses.length) continue;

      const candidates = await draftDelegate.findMany({
        where: {
          signup: false,
          createdAt: { gte: new Date(new Date(user.createdAt).getTime() - REFERRAL_CAPTURE_LOOKBACK_MS) },
          OR: orClauses,
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          referralCode: true,
          referrerUserId: true,
          ipAddress: true,
          deviceFingerprint: true,
          createdAt: true,
        },
      });

      if (!candidates.length) continue;

      const withSignal = candidates.map((c) => ({
        ...c,
        signalStrength:
          userFp && c.deviceFingerprint === userFp ? "fingerprint" : "ip",
      }));
      const summarized = summarizeReferrerCandidates(withSignal);
      const hasFingerprintMatch = withSignal.some(
        (c) => c.signalStrength === "fingerprint",
      );
      const status =
        summarized.length === 1
          ? hasFingerprintMatch
            ? "single_candidate_strong"
            : "single_candidate_weak"
          : "ambiguous";

      const suggestedReferrer = summarized[0] || null;
      items.push({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        status,
        hasFingerprintMatch,
        candidates: summarized,
        suggestedReferrer,
      });
    } catch (loopErr) {
      console.error(`[reconciliation] error processing user ${user.email}:`, loopErr?.message);
      // skip this user, continue with others
    }
  }

  return {
    success: true,
    items,
  };
}

export async function manuallyLinkReferral({
  userId,
  referrerUserId,
  adminUserId,
  adminEmail,
  note,
  draftId,
}) {
  if (!userId || !referrerUserId) {
    throw new Error("userId and referrerUserId are required");
  }
  if (userId === referrerUserId) {
    throw new Error("Cannot self-link referral");
  }

  return prisma.$transaction(async (tx) => {
    const [user, referrer] = await Promise.all([
      tx.user.findUnique({
    where: { id: userId },
        select: { id: true, referredByUserId: true, email: true },
      }),
      tx.user.findUnique({
        where: { id: referrerUserId },
        select: { id: true, email: true, referralCode: true },
      }),
    ]);

    if (!user) throw new Error("User not found");
    if (!referrer) throw new Error("Referrer not found");
    if (user.referredByUserId) throw new Error("User already linked to a referrer");

    await tx.user.update({
      where: { id: user.id },
    data: { referredByUserId: referrer.id },
  });

    const txDraftDelegate = getReferralDraftDelegate(tx);
    if (draftId && txDraftDelegate) {
      await txDraftDelegate.updateMany({
        where: { id: draftId },
        data: {
          signup: true,
          signedUpUserId: user.id,
          matchedAt: new Date(),
        },
      });
    }

    await tx.adminAuditLog.create({
      data: {
        adminUserId: adminUserId || "system",
        adminEmail: adminEmail || null,
        action: "referral_manual_link",
        targetType: "user",
        targetId: user.id,
        detailsJson: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          referrerUserId: referrer.id,
          referrerEmail: referrer.email,
          referrerCode: referrer.referralCode,
          draftId: draftId || null,
          note: typeof note === "string" ? note.slice(0, 500) : null,
        }),
      },
    });

    return {
      success: true,
      userId: user.id,
      referrerUserId: referrer.id,
      referrerCode: referrer.referralCode,
    };
  });
}

/**
 * Links a buyer to a referrer on first purchase (e.g. when referral code was used at checkout).
 * No-op if user already has referredByUserId. Idempotent.
 */
export async function linkReferrerOnFirstPurchase(userId, referrerUserId) {
  if (!userId || !referrerUserId || referrerUserId === userId) return;
  await prisma.user.updateMany({
    where: { id: userId, referredByUserId: null },
    data: { referredByUserId: referrerUserId },
  });
}

/**
 * Records a referral commission for the referred user's FIRST successful purchase only.
 *
 * Idempotency: the DB has a @@unique([sourceType, sourceId, referredUserId]) constraint.
 * This function is intentionally called from BOTH the Stripe route (client-confirm path)
 * AND the Stripe webhook (server-event path) for the same payment. The first call wins;
 * the second returns { recorded: false, duplicate: true } via P2002 handling.
 * Both paths use identical sourceType + sourceId so the constraint reliably deduplicates.
 *
 * Payment method coverage:
 *  - Stripe one-time purchase:  stripe.routes.js /confirm-payment  +  stripe.webhook.js payment_intent.succeeded
 *  - Stripe subscription:       stripe.routes.js /confirm-subscription  +  stripe.webhook.js invoice.payment_succeeded
 *  - Stripe special offer:      stripe.routes.js special-offer routes  +  stripe.webhook.js payment_intent.succeeded
 *  - Crypto (NOWPayments):      crypto.webhook.js finished IPN
 */
export async function recordReferralCommissionFromPayment({
  referredUserId,
  purchaseAmountCents,
  sourceType,
  sourceId,
}) {
  if (!referredUserId || !sourceType || !sourceId) return { recorded: false };
  const amount = Number(purchaseAmountCents || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    console.warn(`⚠️ [referral] Skipping commission for ${sourceType}:${sourceId} — amount is ${amount} cents (null/zero from Stripe). This is expected for subscription checkouts where amount_total is null; the invoice.payment_succeeded event will record the commission instead.`);
    return { recorded: false };
  }

  const commissionCents = Math.floor((amount * REFERRAL_COMMISSION_BPS) / 10000);
  if (commissionCents <= 0) return { recorded: false };

  return await prisma.$transaction(async (tx) => {
    // Serialize first-purchase commission checks per referred user.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${referredUserId} FOR UPDATE`;

    const referredUser = await tx.user.findUnique({
    where: { id: referredUserId },
    select: { id: true, referredByUserId: true },
  });

  if (!referredUser?.referredByUserId) return { recorded: false };
  if (referredUser.referredByUserId === referredUser.id) return { recorded: false };

  // Check if the referrer is in the Advanced Referral Program (earns on ALL purchases).
  const referrer = await tx.user.findUnique({
    where: { id: referredUser.referredByUserId },
    select: { id: true, referralAdvanced: true },
  });
  const isAdvancedReferrer = referrer?.referralAdvanced === true;

  // Standard program: commission only on first purchase.
  // Advanced program: commission on every purchase (idempotency key prevents duplicates per event).
  if (!isAdvancedReferrer) {
    const existingFirstPurchaseCommission = await tx.referralCommission.findFirst({
      where: {
        referredUserId: referredUser.id,
        sourceType: { not: "admin_bonus" },
      },
    select: { id: true },
  });
  if (existingFirstPurchaseCommission) {
      console.log(`⏭️ [referral] Commission skipped for user ${referredUserId} — already recorded on first purchase (${existingFirstPurchaseCommission.id})`);
    return { recorded: false, firstPurchaseOnly: true };
    }
  }

  try {
      await tx.referralCommission.create({
      data: {
        referrerUserId: referredUser.referredByUserId,
        referredUserId: referredUser.id,
        purchaseAmountCents: amount,
        commissionCents,
        sourceType,
        sourceId,
      },
    });
  } catch (error) {
    if (error?.code === "P2002") {
      return { recorded: false, duplicate: true };
    }
    throw error;
  }

    await tx.user.updateMany({
      where: { id: referredUser.id, firstSaleAt: null },
      data: {
        firstSaleAt: new Date(),
        firstSaleEventType: sourceType,
      },
    });

    const programLabel = isAdvancedReferrer ? "advanced" : "standard";
    console.log(`💰 [referral] Commission recorded (${programLabel}): referrer=${referredUser.referredByUserId} ← referred=${referredUser.id}, amount=${commissionCents} cents (${REFERRAL_COMMISSION_BPS/100}% of ${amount}¢), source=${sourceType}:${sourceId}`);
  return { recorded: true, commissionCents };
  });
}

export async function getReferralOverview(userId) {
  const [user, referredUsers, commissions, payoutRequests, totals, totalPaid] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, referralCode: true },
      }),
      prisma.user.findMany({
        where: { referredByUserId: userId },
        select: { id: true, email: true, name: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.referralCommission.findMany({
        where: { referrerUserId: userId },
        select: {
          referredUserId: true,
          purchaseAmountCents: true,
          commissionCents: true,
        },
      }),
      prisma.referralPayoutRequest.findMany({
        where: { userId },
        orderBy: { requestedAt: "desc" },
        select: {
          id: true,
          amountCents: true,
          walletAddress: true,
          status: true,
          requestedAt: true,
          processedAt: true,
          adminNote: true,
        },
      }),
      prisma.referralCommission.aggregate({
        where: { referrerUserId: userId },
        _sum: { commissionCents: true, purchaseAmountCents: true },
      }),
      prisma.referralPayoutRequest.aggregate({
        where: { userId, status: "paid" },
        _sum: { amountCents: true },
      }),
    ]);

  const byReferredUser = new Map();
  for (const c of commissions) {
    const existing = byReferredUser.get(c.referredUserId) || {
      spendCents: 0,
      rewardCents: 0,
    };
    existing.spendCents += c.purchaseAmountCents || 0;
    existing.rewardCents += c.commissionCents || 0;
    byReferredUser.set(c.referredUserId, existing);
  }

  const referrals = referredUsers.map((r) => {
    const stats = byReferredUser.get(r.id) || { spendCents: 0, rewardCents: 0 };
    return {
      ...r,
      spendCents: stats.spendCents,
      rewardCents: stats.rewardCents,
    };
  });

  const totalRewardCents = totals._sum.commissionCents || 0;
  const totalReferredSpendCents = totals._sum.purchaseAmountCents || 0;
  const totalPaidCents = totalPaid._sum.amountCents || 0;
  const eligibleCents = totalRewardCents - totalPaidCents;
  const pendingRequest = payoutRequests.find((p) => p.status === "pending") || null;

  return {
    user,
    referrals,
    payoutRequests,
    pendingRequest,
    summary: {
      registeredReferralsCount: referredUsers.length,
      totalRewardCents,
      totalReferredSpendCents,
      totalPaidCents,
      eligibleCents,
      minPayoutCents: REFERRAL_MIN_PAYOUT_CENTS,
      canRequestPayout:
        !pendingRequest && eligibleCents >= REFERRAL_MIN_PAYOUT_CENTS,
    },
  };
}
