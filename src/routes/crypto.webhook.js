import express from 'express';
import crypto from 'crypto';
import prisma from "../lib/prisma.js";
import { recordReferralCommissionFromPayment } from "../services/referral.service.js";
const router = express.Router();

const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;

// Verify IPN signature from NOWPayments
function verifyIPNSignature(body, signature) {
  if (!NOWPAYMENTS_IPN_SECRET) {
    console.error('❌ NOWPayments IPN secret not configured');
    return false;
  }

  function sortObject(obj) {
    return Object.keys(obj).sort().reduce((result, key) => {
      result[key] = (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]))
        ? sortObject(obj[key])
        : obj[key];
      return result;
    }, {});
  }

  const sortedBody = sortObject(body);
  const hmac = crypto.createHmac('sha512', NOWPAYMENTS_IPN_SECRET);
  hmac.update(JSON.stringify(sortedBody));
  const calculatedSignature = hmac.digest('hex');

  return calculatedSignature === signature;
}

// Webhook handler for NOWPayments IPN - NEEDS RAW BODY
router.post('/', express.raw({ type: '*/*' }), async (req, res) => {
  let claimedPaymentId = null;
  try {
    const signature = req.headers['x-nowpayments-sig'];

    console.log('📥 ====================================');
    console.log('📥 CRYPTO WEBHOOK RECEIVED');
    console.log('📥 ====================================');
    console.log('   Content-Type:', req.headers['content-type']);
    console.log('   Has signature:', !!signature);
    console.log('   Raw body type:', typeof req.body);
    console.log('   Is Buffer:', Buffer.isBuffer(req.body));
    console.log('   IPN Secret configured:', !!NOWPAYMENTS_IPN_SECRET);

    // Parse body
    let body;
    if (Buffer.isBuffer(req.body)) {
      body = JSON.parse(req.body.toString());
    } else if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }

    console.log('📥 NOWPayments webhook data:', {
      payment_status: body.payment_status,
      order_id: body.order_id,
      payment_id: body.payment_id,
    });

    // Verify signature
    if (!verifyIPNSignature(body, signature)) {
      console.error('❌ Invalid NOWPayments signature — ignoring webhook');
      return res.status(401).json({ status: 'invalid_signature' });
    }

    const { payment_status, order_id, payment_id, actually_paid, pay_currency } = body;

    // Only process finished payments
    if (payment_status !== 'finished') {
      console.log(`ℹ️ Payment status: ${payment_status} — not yet finished, skipping`);
      return res.json({ status: 'ignored', reason: `status_${payment_status}` });
    }

    // Atomic idempotency: use updateMany with a status condition so only ONE concurrent
    // webhook delivery can flip the row from pending → processing. The row count tells
    // us whether we won the race or another delivery already did.
    const claimed = await prisma.cryptoPayment.updateMany({
      where: {
        orderId: order_id,
        status: { in: ['pending', 'confirming'] },
      },
      data: { status: 'processing' },
    });

    if (claimed.count === 0) {
      // Either the row doesn't exist or it was already completed/processing
      const existing = await prisma.cryptoPayment.findFirst({
        where: { orderId: order_id },
      });
      if (!existing) {
        console.error('❌ Crypto payment not found for order:', order_id);
      } else if (existing.status === "processing") {
        const processingSinceMs = Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime();
        if (processingSinceMs > 10 * 60 * 1000) {
          const recovered = await prisma.cryptoPayment.updateMany({
            where: {
              id: existing.id,
              status: "processing",
            },
            data: { status: "confirming" },
          });
          if (recovered.count > 0) {
            console.warn(`⚠️ Recovered stale processing crypto payment ${existing.id}; provider should retry`);
            return res.status(409).json({ status: "retry", reason: "stale_processing_recovered" });
          }
        }
      } else {
        console.log(`ℹ️ Payment already processed or in-flight (status: ${existing.status}):`, order_id);
      }
      return res.json({ status: 'ignored', reason: 'already_processed_or_missing' });
    }

    // Fetch the full record now that we own it
    const cryptoPayment = await prisma.cryptoPayment.findFirst({
      where: { orderId: order_id },
    });

    if (!cryptoPayment) {
      console.error('❌ Crypto payment disappeared after claim — order:', order_id);
      return res.status(500).json({ status: 'error', reason: 'payment_disappeared_after_claim' });
    }
    claimedPaymentId = cryptoPayment.id;

    // Use userId from the DB record — never parse it from the order_id string
    const userId = cryptoPayment.userId;

    // Verify the user still exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      // Mark as orphaned so we can manually recover later
      await prisma.cryptoPayment.update({
        where: { id: cryptoPayment.id },
        data: {
          status: 'orphaned',
          paymentId: String(payment_id),
          paidAmount: String(actually_paid),
          paidCurrency: pay_currency,
          completedAt: new Date(),
        },
      });
      console.error(`❌ User not found for crypto payment — userId: ${userId}, order: ${order_id}. Payment marked orphaned for manual recovery.`);
      return res.json({ status: 'orphaned' });
    }

    // Add credits, mark payment complete, and log the transaction — all in one DB transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { purchasedCredits: { increment: cryptoPayment.credits } },
      });

      await tx.cryptoPayment.update({
        where: { id: cryptoPayment.id },
        data: {
          status: 'completed',
          paymentId: String(payment_id),
          paidAmount: String(actually_paid),
          paidCurrency: pay_currency,
          completedAt: new Date(),
        },
      });

      // Use upsert so a duplicate IPN that somehow slips through never crashes
      await tx.creditTransaction.upsert({
        where: { paymentSessionId: `crypto_${payment_id}` },
        create: {
          userId,
          type: 'purchase',
          amount: cryptoPayment.credits,
          description: `Crypto payment — ${cryptoPayment.credits} credits (${pay_currency})`,
          paymentSessionId: `crypto_${payment_id}`,
        },
        update: {}, // already exists — no-op
      });
    });

    console.log(`✅ Crypto payment completed: ${cryptoPayment.credits} credits added to user ${userId}`);
    console.log(`   Paid: ${actually_paid} ${pay_currency}`);

    // Record referral commission for the referred user's first crypto purchase.
    // priceUsd is stored in USD on the CryptoPayment record — convert to cents.
    try {
      const purchaseAmountCents = Math.round((cryptoPayment.priceUsd || 0) * 100);
      await recordReferralCommissionFromPayment({
        referredUserId: userId,
        purchaseAmountCents,
        sourceType: "crypto_payment",
        sourceId: cryptoPayment.id,
      });
    } catch (refErr) {
      // Non-fatal — credits were already credited above
      console.warn("⚠️ [referral] Could not record commission for crypto payment:", refErr.message);
    }

    return res.json({ status: 'processed' });

  } catch (error) {
    if (claimedPaymentId) {
      try {
        await prisma.cryptoPayment.updateMany({
          where: { id: claimedPaymentId, status: "processing" },
          data: { status: "confirming" },
        });
      } catch (recoverErr) {
        console.error("❌ Failed to recover processing crypto payment status:", recoverErr.message);
      }
    }
    console.error('❌ Crypto webhook processing error:', error);
    return res.status(500).json({ status: 'error' });
  }
});

// Debug endpoint
router.get('/', (req, res) => {
  console.log('📥 Crypto webhook GET check received');
  res.json({
    status: 'ok',
    message: 'Crypto webhook endpoint is reachable',
    ipnSecretConfigured: !!NOWPAYMENTS_IPN_SECRET,
    timestamp: new Date().toISOString(),
  });
});

export default router;
