import { subscriptionAllowsSelfServeApiKey } from "@shared/apiKeyEligibility.js";

/** Starter+ with active subscription — mint keys in Settings; API calls use the normal account pool. */
export function hasSelfServeApiAccess(user) {
  return subscriptionAllowsSelfServeApiKey(user ?? {});
}
