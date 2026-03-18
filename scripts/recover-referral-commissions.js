/**
 * REFERRAL COMMISSION RECOVERY SCRIPT
 *
 * PURPOSE:
 *   The bug: subscription checkout.session.completed events passed
 *   session.amount_total = null to recordReferralCommissionFromPayment,
 *   so the amount <= 0 guard silently dropped every subscription commission.
 *   One-time purchases were likely fine (session.amount_total is set for those).
 *
 * WHAT THIS SCRIPT DOES:
 *   1. Finds every user who has referredByUserId set (was referred by someone)
 *   2. For each referred user, checks if they have ANY CreditTransaction with a
 *      paymentSessionId (meaning they made at least one real payment)
 *   3. Checks if a ReferralCommission already exists for that referred user
 *   4. If no commission exists but a payment does → this is a missed commission
 *   5. Finds the earliest/first payment transaction for that user
 *   6. Calculates 15% commission (1500 bps) on that amount
 *   7. In DRY_RUN=true mode: prints what would be created, touches nothing
 *   8. In DRY_RUN=false mode: creates the ReferralCommission record
 *
 * USAGE ON REPLIT:
 *   1. Copy this file into your project
 *   2. Run in dry-run first (safe, read-only):
 *        DRY_RUN=true node scripts/recover-referral-commissions.js
 *   3. Review the output carefully
 *   4. If happy with the results, run for real:
 *        DRY_RUN=false node scripts/recover-referral-commissions.js
 *
 * SAFETY:
 *   - The @@unique([sourceType, sourceId, referredUserId]) constraint on
 *     ReferralCommission prevents any duplicates even if you run it twice.
 *   - Does NOT modify user balances — commissions are redeemed separately
 *     via the existing payout flow.
 *   - Does NOT touch users who already have a commission recorded.
 *   - Only processes the FIRST payment per referred user (same rule as
 *     the live code: commission on first purchase only).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN !== "false"; // default: true (safe)
const COMMISSION_BPS = 1500; // 15.00% — must match referral.service.js

console.log("=".repeat(70));
console.log("REFERRAL COMMISSION RECOVERY SCRIPT");
console.log(`MODE: ${DRY_RUN ? "DRY RUN (read-only, no changes)" : "⚠️  LIVE — WRITING TO DATABASE"}`);
console.log("=".repeat(70));
console.log();

async function main() {
  // ── Step 1: Find all referred users (have a referrer) ──────────────────────
  const referredUsers = await prisma.user.findMany({
    where: {
      referredByUserId: { not: null },
    },
    select: {
      id: true,
      email: true,
      referredByUserId: true,
    },
  });

  console.log(`Found ${referredUsers.length} users with a referrer set.`);
  console.log();

  let totalMissed = 0;
  let totalRecovered = 0;
  let totalAlreadyExists = 0;
  let totalNoPurchase = 0;
  let totalCommissionCents = 0;

  for (const user of referredUsers) {
    // ── Step 2: Check if a commission already exists for this referred user ───
    const existingCommission = await prisma.referralCommission.findFirst({
      where: { referredUserId: user.id },
      select: { id: true, commissionCents: true, sourceId: true, createdAt: true },
    });

    if (existingCommission) {
      totalAlreadyExists++;
      continue; // Already has a commission — skip
    }

    // ── Step 3: Find their first real payment transaction ─────────────────────
    // CreditTransaction with a paymentSessionId = a Stripe payment was made.
    // We sort ascending to get the earliest (first) payment.
    const firstPaymentTx = await prisma.creditTransaction.findFirst({
      where: {
        userId: user.id,
        paymentSessionId: { not: null },
        amount: { gt: 0 }, // positive = credit purchase (not a refund)
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        paymentSessionId: true,
        amount: true,        // credits awarded
        description: true,
        createdAt: true,
      },
    });

    if (!firstPaymentTx) {
      totalNoPurchase++;
      continue; // No payment found — nothing to recover
    }

    // ── Step 4: Determine the purchase amount in cents ────────────────────────
    // CreditTransaction.amount stores credits (not dollars).
    // We need the real dollar amount. Best source: paymentSessionId lets us
    // derive the sourceType. We store the cents in description or we use
    // a heuristic based on the session type.
    //
    // Since we don't store cents in CreditTransaction directly, we use the
    // paymentSessionId prefix to identify source type and set sourceType.
    const sessionId = firstPaymentTx.paymentSessionId;
    let sourceType = "stripe_unknown";
    if (sessionId.startsWith("cs_")) sourceType = "stripe_checkout_session";
    else if (sessionId.startsWith("pi_")) sourceType = "stripe_payment_intent";
    else if (sessionId.startsWith("in_")) sourceType = "stripe_invoice";
    else if (sessionId.startsWith("sub_")) sourceType = "stripe_subscription";

    // ── Step 5: Try to get purchase amount from description ───────────────────
    // Description format examples:
    //   "Purchased 100 credits" / "Credits purchase" / etc.
    // Since we don't reliably have cents here, we need to look it up from
    // the ReferralCommission table for similar sessions OR derive it.
    //
    // Best approach: check if any other user's commission used this same
    // session pattern and infer. Otherwise flag for manual review.
    //
    // IMPORTANT: For subscription sessions (cs_ prefix), amount_total was
    // null — that's the bug. We mark these for manual amount verification
    // UNLESS the description contains a dollar amount.
    let purchaseAmountCents = extractCentsFromDescription(firstPaymentTx.description);

    if (!purchaseAmountCents || purchaseAmountCents <= 0) {
      // Can't determine amount from description — flag for manual review
      totalMissed++;
      console.log(`⚠️  NEEDS MANUAL REVIEW:`);
      console.log(`   Referred user : ${user.email} (${user.id})`);
      console.log(`   Referrer ID   : ${user.referredByUserId}`);
      console.log(`   First payment : ${sessionId} (${sourceType})`);
      console.log(`   Tx created    : ${firstPaymentTx.createdAt.toISOString()}`);
      console.log(`   Description   : ${firstPaymentTx.description || "(none)"}`);
      console.log(`   → Cannot auto-recover: purchase amount in cents unknown.`);
      console.log(`     Look up ${sessionId} in Stripe dashboard, find amount_paid,`);
      console.log(`     then manually insert into ReferralCommission table.`);
      console.log();
      continue;
    }

    // ── Step 6: Calculate 15% commission ─────────────────────────────────────
    const commissionCents = Math.floor((purchaseAmountCents * COMMISSION_BPS) / 10000);
    if (commissionCents <= 0) continue;

    totalCommissionCents += commissionCents;
    totalRecovered++;

    const referrerUser = await prisma.user.findUnique({
      where: { id: user.referredByUserId },
      select: { email: true },
    });

    console.log(`${DRY_RUN ? "[DRY RUN] Would create" : "✅ Creating"} commission:`);
    console.log(`   Referred user : ${user.email} (${user.id})`);
    console.log(`   Referrer      : ${referrerUser?.email || "?"} (${user.referredByUserId})`);
    console.log(`   Purchase      : $${(purchaseAmountCents / 100).toFixed(2)} via ${sessionId}`);
    console.log(`   Commission    : $${(commissionCents / 100).toFixed(2)} (15%)`);
    console.log();

    if (!DRY_RUN) {
      try {
        await prisma.referralCommission.create({
          data: {
            referrerUserId: user.referredByUserId,
            referredUserId: user.id,
            purchaseAmountCents,
            commissionCents,
            sourceType,
            sourceId: sessionId,
          },
        });
      } catch (err) {
        if (err.code === "P2002") {
          console.log(`   ⏭️  Already exists (P2002 duplicate) — skipped.`);
        } else {
          console.error(`   ❌ Failed to create commission: ${err.message}`);
        }
      }
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log(`Total referred users scanned  : ${referredUsers.length}`);
  console.log(`Already had commission        : ${totalAlreadyExists}`);
  console.log(`No payment found (free users) : ${totalNoPurchase}`);
  console.log(`Needs manual review (no cents): ${totalMissed}`);
  console.log(`${DRY_RUN ? "Would recover" : "Recovered"}              : ${totalRecovered}`);
  console.log(`Total commission${DRY_RUN ? " to be" : ""} added   : $${(totalCommissionCents / 100).toFixed(2)}`);
  console.log();

  if (DRY_RUN && totalRecovered > 0) {
    console.log(`✅ Dry run complete. Re-run with DRY_RUN=false to apply changes.`);
  } else if (!DRY_RUN) {
    console.log(`✅ Recovery complete.`);
  } else {
    console.log(`✅ Nothing to recover.`);
  }

  if (totalMissed > 0) {
    console.log();
    console.log(`⚠️  ${totalMissed} commission(s) require manual Stripe lookup.`);
    console.log(`   For each flagged session ID above:`);
    console.log(`   1. Open Stripe Dashboard → search the session/payment ID`);
    console.log(`   2. Note the amount_paid in cents`);
    console.log(`   3. Run this SQL against your production DB:`);
    console.log();
    console.log(`   INSERT INTO "ReferralCommission"`);
    console.log(`     ("id","referrerUserId","referredUserId","purchaseAmountCents","commissionCents","sourceType","sourceId","createdAt")`);
    console.log(`   VALUES`);
    console.log(`     (gen_random_uuid(), '<referrerUserId>', '<referredUserId>', <amountCents>, FLOOR(<amountCents>*0.15), '<sourceType>', '<sessionId>', NOW())`);
    console.log(`   ON CONFLICT ("sourceType","sourceId","referredUserId") DO NOTHING;`);
  }
}

/**
 * Try to parse a dollar amount from a CreditTransaction description.
 * Common formats stored by the app:
 *   "Purchased 100 credits for $29.99"
 *   "Credits purchase - $9.99"
 *   "Subscription - Starter - $19.99/mo"
 *   "One-time purchase: 200 credits ($49.99)"
 * Returns cents (integer) or 0 if not found.
 */
function extractCentsFromDescription(description) {
  if (!description) return 0;
  // Match $XX.XX or $XX patterns
  const match = description.match(/\$(\d+(?:\.\d{1,2})?)/);
  if (match) {
    return Math.round(parseFloat(match[1]) * 100);
  }
  return 0;
}

main()
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
