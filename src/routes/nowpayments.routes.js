import express from 'express';
import prisma from "../lib/prisma.js";
import { authMiddleware } from '../middleware/auth.middleware.js';
const router = express.Router();

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';

// Dynamic pricing (same as Stripe - $0.012 per credit)
const PRICE_PER_CREDIT = 0.012;

// Special offer package
const SPECIAL_OFFER = {
  price: 6,
  credits: 250,
};

// Resolve the base URL used for NOWPayments callbacks.
// Priority: explicit env var → production domain → dev fallback
function getBaseUrl() {
  if (process.env.NOWPAYMENTS_IPN_BASE_URL) return process.env.NOWPAYMENTS_IPN_BASE_URL;
  if (process.env.NODE_ENV === 'production') return 'https://modelclone.app';
  // Replit dev tunnels
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  return `http://localhost:${process.env.PORT || 5000}`;
}

// Create crypto payment for credits
router.post('/create-payment', authMiddleware, async (req, res) => {
  try {
    const { credits, type } = req.body;
    const userId = req.user.userId;

    if (!NOWPAYMENTS_API_KEY) {
      return res.status(500).json({ error: 'Crypto payments not configured' });
    }

    let priceUsd, creditAmount, orderDescription;

    if (type === 'special-offer') {
      priceUsd = SPECIAL_OFFER.price;
      creditAmount = SPECIAL_OFFER.credits;
      orderDescription = 'ModelClone Special Offer - AI Model + 250 Credits';
    } else {
      if (!credits || credits < 2000 || credits > 10000) {
        return res.status(400).json({ error: 'Credit amount must be between 2000 and 10000' });
      }
      priceUsd = Math.round(credits * PRICE_PER_CREDIT * 100) / 100;
      creditAmount = credits;
      orderDescription = `ModelClone - ${creditAmount} Credits`;
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cancel any previous pending/confirming invoices for this user+type+credits
    // so if the user switches currency the old dangling invoice can never double-credit.
    await prisma.cryptoPayment.updateMany({
      where: {
        userId,
        type: type || 'credits',
        credits: creditAmount,
        status: { in: ['pending', 'confirming'] },
      },
      data: { status: 'cancelled' },
    });

    // Create unique order ID — format: {userId}_{type}_{credits}_{timestamp}
    const orderId = `${userId}_${type || 'credits'}_${creditAmount}_${Date.now()}`;

    const baseUrl = getBaseUrl();

    // Create invoice via NOWPayments API
    const response = await fetch(`${NOWPAYMENTS_API_URL}/invoice`, {
      method: 'POST',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: priceUsd,
        price_currency: 'usd',
        order_id: orderId,
        order_description: orderDescription,
        ipn_callback_url: `${baseUrl}/api/crypto/webhook`,
        success_url: `${baseUrl}/dashboard?crypto_success=true`,
        cancel_url: `${baseUrl}/dashboard?crypto_cancelled=true`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ NOWPayments API error:', errorData);
      return res.status(500).json({ error: 'Failed to create crypto payment' });
    }

    const invoiceData = await response.json();
    console.log('✅ NOWPayments invoice created:', invoiceData.id, '| order:', orderId);

    // Store pending payment — userId saved directly for reliable webhook matching
    await prisma.cryptoPayment.create({
      data: {
        id: invoiceData.id,
        orderId,
        userId,
        credits: creditAmount,
        priceUsd,
        type: type || 'credits',
        status: 'pending',
        invoiceUrl: invoiceData.invoice_url,
      },
    });

    res.json({
      success: true,
      invoiceUrl: invoiceData.invoice_url,
      invoiceId: invoiceData.id,
    });

  } catch (error) {
    console.error('❌ Create crypto payment error:', error);
    res.status(500).json({ error: 'Failed to create crypto payment' });
  }
});

// NOTE: Webhook handler is in crypto.webhook.js (mounted BEFORE body-parsing middleware)

// Get available cryptocurrencies
router.get('/currencies', async (req, res) => {
  try {
    if (!NOWPAYMENTS_API_KEY) {
      return res.status(500).json({ error: 'Crypto payments not configured' });
    }

    const response = await fetch(`${NOWPAYMENTS_API_URL}/currencies`, {
      headers: { 'x-api-key': NOWPAYMENTS_API_KEY },
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch currencies' });
    }

    const data = await response.json();
    const popular = ['btc', 'eth', 'usdt', 'usdc', 'sol', 'bnb', 'doge', 'ltc', 'trx', 'matic'];
    const currencies = popular.filter(c => data.currencies.includes(c));

    res.json({ currencies });

  } catch (error) {
    console.error('❌ Fetch currencies error:', error);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

// Check API status
router.get('/status', async (req, res) => {
  try {
    if (!NOWPAYMENTS_API_KEY) {
      return res.json({ available: false, reason: 'Not configured' });
    }

    const response = await fetch(`${NOWPAYMENTS_API_URL}/status`, {
      headers: { 'x-api-key': NOWPAYMENTS_API_KEY },
    });

    if (!response.ok) {
      return res.json({ available: false, reason: 'API unavailable' });
    }

    const data = await response.json();
    res.json({ available: data.message === 'OK' });

  } catch (error) {
    res.json({ available: false, reason: error.message });
  }
});

export default router;
