/** HTTP integration keys minted by users in Settings — must stay in sync with server checks. */

export const SELF_SERVE_API_KEY_ELIGIBLE_TIERS = new Set([
  "starter",
  "pro",
  "business",
]);

/**
 * @param {{ subscriptionTier?: string | null; subscriptionStatus?: string | null }} userLike
 */
export function subscriptionAllowsSelfServeApiKey(userLike) {
  const tier = String(userLike.subscriptionTier ?? "").toLowerCase();
  const status = String(userLike.subscriptionStatus ?? "").toLowerCase();
  const active = ["active", "trialing"].includes(status);
  return SELF_SERVE_API_KEY_ELIGIBLE_TIERS.has(tier) && active;
}
