const ACTIVE_PREMIUM_STATUSES = new Set(["active", "trialing"]);

function normalizeStatus(status) {
  return typeof status === "string" ? status.trim().toLowerCase() : "";
}

export function hasPremiumAccess(user) {
  if (!user) return false;

  const subscriptionStatus = normalizeStatus(user.subscriptionStatus);

  return (
    user.role === "admin" ||
    ACTIVE_PREMIUM_STATUSES.has(subscriptionStatus) ||
    Boolean(user.premiumFeaturesUnlocked)
  );
}

export function hasBillingAccess(user) {
  if (!user) return false;

  const subscriptionStatus = normalizeStatus(user.subscriptionStatus);

  return (
    ACTIVE_PREMIUM_STATUSES.has(subscriptionStatus) ||
    Boolean(user.stripeSubscriptionId) ||
    Boolean(user.subscriptionTier) ||
    Boolean(user.stripeCustomerId)
  );
}
