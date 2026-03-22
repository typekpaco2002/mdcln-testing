/**
 * Shared credit scaling for Stripe metadata, checkout, webhooks, and admin tools.
 * Legacy purchases/subscriptions used ≤1000 raw units; we multiply by 10 for parity with current tiers.
 *
 * @param {string|number|null|undefined} rawCredits
 * @returns {number}
 */
export function normalizeCreditUnits(rawCredits) {
  const parsed = parseInt(String(rawCredits ?? "0"), 10) || 0;
  if (parsed > 0 && parsed <= 1000) return parsed * 10;
  return parsed;
}

export const SUBSCRIPTION_PRICING = {
  starter: {
    monthly: { price: 29, priceCents: 2900, credits: 2900 },
    annual: { price: 289, priceCents: 28900, credits: 2900 },
  },
  pro: {
    monthly: { price: 79, priceCents: 7900, credits: 8900 },
    annual: { price: 787, priceCents: 78700, credits: 8900 },
  },
  business: {
    monthly: { price: 199, priceCents: 19900, credits: 24900 },
    annual: { price: 1982, priceCents: 198200, credits: 24900 },
  },
};

export function getSubscriptionPricing(tierId, billingCycle) {
  return SUBSCRIPTION_PRICING?.[tierId]?.[billingCycle] || null;
}

/**
 * `billingCycle` is stored on subscription metadata for embedded checkout; hosted Checkout
 * historically omitted it — derive from Stripe plan interval when missing.
 *
 * @param {{ metadata?: Record<string, string>, items?: { data?: Array<{ plan?: { interval?: string } }> } }} subscription
 * @returns {"monthly"|"annual"}
 */
export function resolveSubscriptionBillingCycle(subscription) {
  const m = subscription?.metadata?.billingCycle;
  if (m === "annual" || m === "monthly") return m;
  const interval = subscription?.items?.data?.[0]?.plan?.interval;
  if (interval === "year") return "annual";
  if (interval === "month") return "monthly";
  return "monthly";
}

export function inferSubscriptionCreditsFromAmount(amountCents, billingCycleOrInterval) {
  const amount = parseInt(String(amountCents ?? "0"), 10) || 0;
  if (amount <= 0) return 0;

  const cycle =
    billingCycleOrInterval === "year" || billingCycleOrInterval === "annual"
      ? "annual"
      : "monthly";

  const candidates = Object.entries(SUBSCRIPTION_PRICING)
    .map(([tierId, pricing]) => ({ tierId, ...pricing[cycle] }))
    .filter(Boolean);

  const exact = candidates.find((candidate) => candidate.priceCents === amount);
  if (exact) return exact.credits;

  let nearest = null;
  for (const candidate of candidates) {
    const delta = Math.abs(candidate.priceCents - amount);
    if (!nearest || delta < nearest.delta) {
      nearest = { ...candidate, delta };
    }
  }

  if (!nearest) return 0;
  const tolerance = Math.max(100, Math.round(nearest.priceCents * 0.2));
  return nearest.delta <= tolerance ? nearest.credits : 0;
}

export function inferSubscriptionPlanFromAmount(amountCents, billingCycleOrInterval) {
  const amount = parseInt(String(amountCents ?? "0"), 10) || 0;
  if (amount <= 0) return null;

  const cycle =
    billingCycleOrInterval === "year" || billingCycleOrInterval === "annual"
      ? "annual"
      : "monthly";

  const candidates = Object.entries(SUBSCRIPTION_PRICING)
    .map(([tierId, pricing]) => ({ tierId, billingCycle: cycle, ...pricing[cycle] }))
    .filter(Boolean);

  const exact = candidates.find((candidate) => candidate.priceCents === amount);
  if (exact) return exact;

  let nearest = null;
  for (const candidate of candidates) {
    const delta = Math.abs(candidate.priceCents - amount);
    if (!nearest || delta < nearest.delta) {
      nearest = { ...candidate, delta };
    }
  }

  if (!nearest) return null;
  const tolerance = Math.max(100, Math.round(nearest.priceCents * 0.2));
  return nearest.delta <= tolerance ? nearest : null;
}
