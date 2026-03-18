import prisma from "../lib/prisma.js";
import {
  REFERRAL_MIN_PAYOUT_CENTS,
  REFERRAL_COOKIE_NAME,
  getReferralCookieOptions,
  getReferralReconciliationItems,
  manuallyLinkReferral,
  getReferralOverview,
  isReservedReferralCode,
  isValidSolanaAddress,
  normalizeReferralCode,
  recordReferralCaptureHint,
  signReferralCaptureToken,
} from "../services/referral.service.js";
import { sendReferralPayoutRequestEmail } from "../services/email.service.js";

const REFERRAL_LANDING_BASE = (process.env.REFERRAL_LANDING_URL || "https://modelclone.app/create-ai-model").replace(/\/+$/, "");

function getReferralLink(referralCode) {
  if (!referralCode) return null;
  return `${REFERRAL_LANDING_BASE}?ref=${encodeURIComponent(referralCode)}`;
}

function getReferralBaseUrl(req) {
  return REFERRAL_LANDING_BASE;
}

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.ip ||
    req.connection?.remoteAddress ||
    "unknown"
  );
}

export async function resolveReferralCode(req, res) {
  try {
    const normalized = normalizeReferralCode(req.params.suffix);
    if (!normalized) {
      return res.status(400).json({
        success: false,
        message: "Invalid referral code format",
      });
    }

    const referrer = await prisma.user.findUnique({
      where: { referralCode: normalized },
      select: { id: true, name: true },
    });

    return res.json({
      success: true,
      exists: !!referrer,
      referrerName: referrer?.name || null,
    });
  } catch (error) {
    console.error("Resolve referral code error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/referrals/capture
 * Capture referral attribution hint by ip/fingerprint for later signup matching.
 */
export async function captureReferralHint(req, res) {
  try {
    const { referralCode, deviceFingerprint, userAgent } = req.body || {};
    const normalized = normalizeReferralCode(referralCode);
    if (!normalized) {
      return res.status(400).json({
        success: false,
        message: "Invalid referral code format",
      });
    }

    const capture = await recordReferralCaptureHint({
      referralCode: normalized,
      ipAddress: getClientIp(req),
      deviceFingerprint: String(
        deviceFingerprint || "no-fingerprint-available",
      ),
      userAgent: String(userAgent || req.headers["user-agent"] || "Unknown"),
    });
    if (!capture?.recorded) {
      return res.status(404).json({
        success: false,
        message: "Referral code not found",
      });
    }

    try {
      if (capture?.recorded) {
        const signedToken = signReferralCaptureToken({
          draftId: capture.draftId || undefined,
          referralCode: capture.referralCode,
          referrerUserId: capture.referrerUserId,
        });
        res.cookie(REFERRAL_COOKIE_NAME, signedToken, getReferralCookieOptions());
      }
    } catch (cookieErr) {
      console.warn("Failed to set referral attribution cookie:", cookieErr?.message);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Capture referral hint error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getReferralReconciliation(req, res) {
  try {
    const limitRaw = Number(req.query?.limit);
    const limit = Number.isFinite(limitRaw) ? limitRaw : 100;
    const result = await getReferralReconciliationItems(limit);
    return res.json(result);
  } catch (error) {
    console.error("Get referral reconciliation error:", error?.message || error, error?.stack);
    return res.status(500).json({ success: false, message: error?.message || "Server error" });
  }
}

export async function linkReferralReconciliation(req, res) {
  try {
    const { userId, referrerUserId, note, draftId } = req.body || {};
    const result = await manuallyLinkReferral({
      userId,
      referrerUserId,
      adminUserId: req.user?.userId,
      adminEmail: req.user?.email || null,
      note,
      draftId,
    });
    return res.json(result);
  } catch (error) {
    const message = error?.message || "Failed to link referral";
    const lower = String(message).toLowerCase();
    if (
      lower.includes("not found") ||
      lower.includes("already linked") ||
      lower.includes("self-link")
    ) {
      return res.status(400).json({ success: false, message });
    }
    console.error("Manual referral link error:", error?.message, error?.stack);
    return res.status(500).json({ success: false, message: error?.message || "Server error" });
  }
}

export async function getMyReferralOverview(req, res) {
  try {
    const userId = req.user.userId;
    const overview = await getReferralOverview(userId);

    const referralVideoUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL.replace(/\/+$/, "")}/referral-videos/kuba-first-1k.mp4`
      : null;

    res.json({
      success: true,
      referralCode: overview.user?.referralCode || null,
      referralLink: overview.user?.referralCode
        ? getReferralLink(overview.user.referralCode)
        : null,
      referrals: overview.referrals,
      payoutRequests: overview.payoutRequests,
      pendingRequest: overview.pendingRequest,
      summary: overview.summary,
      referralVideoUrl,
    });
  } catch (error) {
    console.error("Get referral overview error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function upsertMyReferralCode(req, res) {
  try {
    const userId = req.user.userId;
    const { suffix } = req.body;
    if (isReservedReferralCode(suffix)) {
      return res.status(400).json({
        success: false,
        message: "This referral suffix is reserved. Please choose another one.",
      });
    }
    const normalized = normalizeReferralCode(suffix);

    if (!normalized) {
      return res.status(400).json({
        success: false,
        message:
          "Suffix must be 4-30 chars and contain only lowercase letters, numbers, - or _",
      });
    }

    const existing = await prisma.user.findUnique({
      where: { referralCode: normalized },
      select: { id: true },
    });
    if (existing && existing.id !== userId) {
      return res.status(409).json({
        success: false,
        message: "This referral suffix is already taken",
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { referralCode: normalized },
      select: { referralCode: true },
    });

    res.json({
      success: true,
      referralCode: updated.referralCode,
      referralLink: getReferralLink(updated.referralCode),
    });
  } catch (error) {
    console.error("Upsert referral code error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function createPayoutRequest(req, res) {
  try {
    const userId = req.user.userId;
    const { walletAddress } = req.body;

    if (!isValidSolanaAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid Solana wallet address (base58, usually 32-44 chars) for USDT (SPL).",
      });
    }

    const payout = await prisma.$transaction(async (tx) => {
      // Serialize payout requests for this user.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

      const pending = await tx.referralPayoutRequest.findFirst({
        where: { userId, status: "pending" },
        select: { id: true },
      });
      if (pending) {
        const err = new Error("PENDING_EXISTS");
        err.code = "PENDING_EXISTS";
        throw err;
      }

      const [totals, totalPaid] = await Promise.all([
        tx.referralCommission.aggregate({
          where: { referrerUserId: userId },
          _sum: { commissionCents: true },
        }),
        tx.referralPayoutRequest.aggregate({
          where: { userId, status: "paid" },
          _sum: { amountCents: true },
        }),
      ]);

      const totalRewardCents = totals._sum.commissionCents || 0;
      const totalPaidCents = totalPaid._sum.amountCents || 0;
      const eligibleCents = Math.max(0, totalRewardCents - totalPaidCents);

      if (eligibleCents < REFERRAL_MIN_PAYOUT_CENTS) {
        const err = new Error("MIN_PAYOUT_NOT_MET");
        err.code = "MIN_PAYOUT_NOT_MET";
        throw err;
      }

      return await tx.referralPayoutRequest.create({
        data: {
          userId,
          amountCents: eligibleCents,
          walletAddress: walletAddress.trim(),
          status: "pending",
        },
        select: {
          id: true,
          amountCents: true,
          walletAddress: true,
          status: true,
          requestedAt: true,
        },
      });
    });

    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const displayName = userProfile?.name || userProfile?.email || userId;
    await sendReferralPayoutRequestEmail({
      username: displayName,
      payoutAmountUsd: (payout.amountCents / 100).toFixed(2),
      walletAddress: payout.walletAddress,
    });

    res.status(201).json({
      success: true,
      payoutRequest: payout,
      message: "Payout request submitted. Admin has been notified.",
    });
  } catch (error) {
    if (error?.code === "PENDING_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "You already have a pending payout request.",
      });
    }
    if (error?.code === "MIN_PAYOUT_NOT_MET") {
      return res.status(400).json({
        success: false,
        message: "Minimum payout amount is $100.",
      });
    }
    console.error("Create payout request error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getAdminReferralOverview(req, res) {
  try {
    const [participants, commissionByReferrer, paidByUser, referredCounts, pending] =
      await Promise.all([
        prisma.user.findMany({
          where: { referralCode: { not: null } },
          select: { id: true, email: true, name: true, referralCode: true, referralAdvanced: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.referralCommission.groupBy({
          by: ["referrerUserId"],
          _sum: { commissionCents: true, purchaseAmountCents: true },
        }),
        prisma.referralPayoutRequest.groupBy({
          by: ["userId"],
          where: { status: "paid" },
          _sum: { amountCents: true },
        }),
        prisma.user.groupBy({
          by: ["referredByUserId"],
          where: { referredByUserId: { not: null } },
          _count: { _all: true },
        }),
        prisma.referralPayoutRequest.findMany({
          where: { status: "pending" },
          orderBy: { requestedAt: "asc" },
          select: {
            id: true,
            amountCents: true,
            walletAddress: true,
            status: true,
            requestedAt: true,
            user: { select: { id: true, email: true, name: true, referralCode: true } },
          },
        }),
      ]);

    const commissionMap = new Map(
      commissionByReferrer.map((x) => [
        x.referrerUserId,
        {
          rewardCents: x._sum.commissionCents || 0,
          spendCents: x._sum.purchaseAmountCents || 0,
        },
      ]),
    );
    const paidMap = new Map(paidByUser.map((x) => [x.userId, x._sum.amountCents || 0]));
    const countMap = new Map(
      referredCounts
        .filter((x) => x.referredByUserId)
        .map((x) => [x.referredByUserId, x._count._all || 0]),
    );

    const users = participants.map((u) => {
      const totals = commissionMap.get(u.id) || { rewardCents: 0, spendCents: 0 };
      const paidCents = paidMap.get(u.id) || 0;
      return {
        ...u,
        referredUsersCount: countMap.get(u.id) || 0,
        totalReferredSpendCents: totals.spendCents,
        totalRewardCents: totals.rewardCents,
        totalPaidCents: paidCents,
        eligibleCents: totals.rewardCents - paidCents,
      };
    });

    res.json({
      success: true,
      users,
      pendingPayoutRequests: pending,
    });
  } catch (error) {
    console.error("Admin referral overview error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function markPayoutRequestPaid(req, res) {
  try {
    const { id } = req.params;
    const { adminNote } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.referralPayoutRequest.updateMany({
        where: { id, status: "pending" },
        data: {
          status: "paid",
          processedAt: new Date(),
          processedByAdminId: req.user.userId,
          adminNote: typeof adminNote === "string" ? adminNote.trim().slice(0, 500) : null,
        },
      });
      if (claimed.count === 0) {
        const err = new Error("NOT_PENDING_OR_MISSING");
        err.code = "NOT_PENDING_OR_MISSING";
        throw err;
      }

      const payout = await tx.referralPayoutRequest.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          amountCents: true,
          status: true,
          processedAt: true,
        },
      });
      if (!payout) {
        const err = new Error("NOT_FOUND");
        err.code = "NOT_FOUND";
        throw err;
      }

      await tx.adminAuditLog.create({
        data: {
          adminUserId: req.user.userId,
          adminEmail: req.user.email || null,
          action: "referral_payout_marked_paid",
          targetType: "referral_payout_request",
          targetId: payout.id,
          detailsJson: JSON.stringify({
            payoutRequestId: payout.id,
            beneficiaryUserId: payout.userId,
            amountCents: payout.amountCents,
            adminNote:
              typeof adminNote === "string" ? adminNote.trim().slice(0, 500) : null,
          }),
        },
      });

      return payout;
    });

    res.json({ success: true, payoutRequest: updated });
  } catch (error) {
    if (error?.code === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Payout request not found" });
    }
    if (error?.code === "NOT_PENDING_OR_MISSING") {
      return res.status(400).json({
        success: false,
        message: "Only pending payout requests can be marked as paid",
      });
    }
    console.error("Mark payout paid error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// ============================================================
// POST /api/referrals/admin/users/:userId/mark-paid
// Mark a referrer's payout as paid directly from participants list.
// - If there is a pending payout request, marks the oldest pending as paid.
// - Otherwise creates an immediate paid payout record from current eligible balance.
// ============================================================
export async function markReferrerPayoutPaid(req, res) {
  try {
    const { userId } = req.params;
    const { adminNote } = req.body || {};

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });
      if (!user) {
        const err = new Error("USER_NOT_FOUND");
        err.code = "USER_NOT_FOUND";
        throw err;
      }

      const [totals, paidTotals, oldestPending, latestWallet] = await Promise.all([
        tx.referralCommission.aggregate({
          where: { referrerUserId: userId },
          _sum: { commissionCents: true },
        }),
        tx.referralPayoutRequest.aggregate({
          where: { userId, status: "paid" },
          _sum: { amountCents: true },
        }),
        tx.referralPayoutRequest.findFirst({
          where: { userId, status: "pending" },
          orderBy: { requestedAt: "asc" },
          select: {
            id: true,
            amountCents: true,
            walletAddress: true,
            requestedAt: true,
          },
        }),
        tx.referralPayoutRequest.findFirst({
          where: { userId },
          orderBy: { requestedAt: "desc" },
          select: { walletAddress: true },
        }),
      ]);

      const totalRewardCents = totals._sum.commissionCents || 0;
      const totalPaidCents = paidTotals._sum.amountCents || 0;
      const eligibleCents = Math.max(0, totalRewardCents - totalPaidCents);

      if (eligibleCents <= 0) {
        const err = new Error("NO_ELIGIBLE_BALANCE");
        err.code = "NO_ELIGIBLE_BALANCE";
        throw err;
      }

      let payoutRecord = null;
      let payoutAmountCents = 0;
      let mode = "direct";

      if (oldestPending) {
        mode = "pending_request";
        payoutAmountCents = Math.min(oldestPending.amountCents || 0, eligibleCents);
        if (payoutAmountCents <= 0) {
          const err = new Error("INVALID_PENDING_AMOUNT");
          err.code = "INVALID_PENDING_AMOUNT";
          throw err;
        }

        await tx.referralPayoutRequest.updateMany({
          where: { id: oldestPending.id, status: "pending" },
          data: {
            status: "paid",
            processedAt: new Date(),
            processedByAdminId: req.user.userId,
            adminNote: typeof adminNote === "string" ? adminNote.trim().slice(0, 500) : null,
          },
        });

        payoutRecord = await tx.referralPayoutRequest.findUnique({
          where: { id: oldestPending.id },
          select: {
            id: true,
            userId: true,
            amountCents: true,
            walletAddress: true,
            status: true,
            requestedAt: true,
            processedAt: true,
          },
        });
      } else {
        payoutAmountCents = eligibleCents;
        payoutRecord = await tx.referralPayoutRequest.create({
          data: {
            userId,
            amountCents: payoutAmountCents,
            walletAddress: latestWallet?.walletAddress || "manual-admin-payout",
            status: "paid",
            processedByAdminId: req.user.userId,
            adminNote: typeof adminNote === "string" ? adminNote.trim().slice(0, 500) : null,
            requestedAt: new Date(),
            processedAt: new Date(),
          },
          select: {
            id: true,
            userId: true,
            amountCents: true,
            walletAddress: true,
            status: true,
            requestedAt: true,
            processedAt: true,
          },
        });
      }

      const remainingEligibleCents = Math.max(0, eligibleCents - payoutAmountCents);

      await tx.adminAuditLog.create({
        data: {
          adminUserId: req.user.userId,
          adminEmail: req.user.email || null,
          action: "referral_referrer_mark_paid",
          targetType: "user",
          targetId: userId,
          detailsJson: JSON.stringify({
            beneficiaryUserId: userId,
            beneficiaryEmail: user.email,
            mode,
            payoutRequestId: payoutRecord?.id || null,
            paidAmountCents: payoutAmountCents,
            eligibleBeforeCents: eligibleCents,
            eligibleAfterCents: remainingEligibleCents,
            adminNote:
              typeof adminNote === "string" ? adminNote.trim().slice(0, 500) : null,
          }),
        },
      });

      return {
        payoutRequest: payoutRecord,
        mode,
        paidAmountCents: payoutAmountCents,
        remainingEligibleCents,
      };
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error?.code === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Referrer not found" });
    }
    if (error?.code === "NO_ELIGIBLE_BALANCE") {
      return res.status(400).json({
        success: false,
        message: "This referrer has no eligible payout balance.",
      });
    }
    if (error?.code === "INVALID_PENDING_AMOUNT") {
      return res.status(400).json({
        success: false,
        message: "Pending payout request has invalid amount.",
      });
    }
    console.error("Mark referrer payout paid error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ============================================================
// POST /api/referrals/admin/users/:userId/add-bonus
// Manually add a bonus to a referrer's eligible payout amount.
// Creates a ReferralCommission row with sourceType "admin_bonus".
// ============================================================
export async function addReferralBonus(req, res) {
  try {
    const adminUserId = req.user.userId;
    const { userId } = req.params;
    const { amountUsd, note } = req.body;

    const amountFloat = parseFloat(amountUsd);
    if (!amountFloat || amountFloat <= 0 || amountFloat > 10000) {
      return res.status(400).json({ success: false, message: "Amount must be between $0.01 and $10,000" });
    }

    const amountCents = Math.round(amountFloat * 100);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, referralCode: true },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const bonusId = `admin_bonus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const commission = await prisma.referralCommission.create({
      data: {
        referrerUserId: userId,
        referredUserId: userId,
        purchaseAmountCents: 0,
        commissionCents: amountCents,
        sourceType: "admin_bonus",
        sourceId: bonusId,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action: "add_referral_bonus",
        targetType: "User",
        targetId: userId,
        detailsJson: JSON.stringify({
          amountCents,
          amountUsd: amountFloat,
          note: note || null,
          commissionId: commission.id,
          targetEmail: user.email,
        }),
      },
    });

    console.log(`✅ Admin ${adminUserId} added $${amountFloat} referral bonus for user ${user.email} (commission ${commission.id})`);

    return res.json({
      success: true,
      message: `$${amountFloat.toFixed(2)} bonus added to ${user.email}'s referral balance`,
      commission,
    });
  } catch (error) {
    console.error("Add referral bonus error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/referrals/admin/users/:userId/set-advanced
 * Promote or demote a user to/from the Advanced Referral Program.
 * Advanced users earn 15% commission on ALL purchases by their referred users (not just first).
 * Body: { advanced: boolean }
 */
export async function setReferralAdvanced(req, res) {
  try {
    const { userId } = req.params;
    const { advanced } = req.body;
    const adminUserId = req.user?.userId;

    if (typeof advanced !== "boolean") {
      return res.status(400).json({ success: false, message: "advanced must be a boolean" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, referralAdvanced: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.referralAdvanced === advanced) {
      return res.json({
        success: true,
        message: `User is already ${advanced ? "in" : "not in"} the Advanced Referral Program`,
        referralAdvanced: advanced,
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { referralAdvanced: advanced },
    });

    // Audit log
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: adminUserId || "system",
        adminEmail: req.user?.email || null,
        action: advanced ? "referral_advanced_promote" : "referral_advanced_demote",
        targetType: "user",
        targetId: userId,
        detailsJson: JSON.stringify({
          userId,
          userEmail: user.email,
          advanced,
        }),
      },
    });

    const action = advanced ? "promoted to" : "removed from";
    console.log(`✅ Admin ${adminUserId} ${action} Advanced Referral Program: ${user.email}`);

    return res.json({
      success: true,
      message: `${user.email} has been ${action} the Advanced Referral Program`,
      referralAdvanced: advanced,
    });
  } catch (error) {
    console.error("Set referral advanced error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
