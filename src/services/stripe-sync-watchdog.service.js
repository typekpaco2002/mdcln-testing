import { reconcileUserCredits } from "./stripe-credit-reconcile.service.js";

/**
 * Stripe sync watchdog.
 *
 * Catches the "user paid Stripe but DB never got updated" failure mode that
 * can happen when a Stripe webhook delivery dies during a fresh signup
 * (5xx during cold start, deploy mid-flight, DB pool exhaustion, etc.), or
 * when the embedded checkout's `/confirm-subscription` POST never fires
 * because the user closed the tab.
 *
 * Strategy: piggy-back on the very next authenticated read of the user's
 * profile (i.e. the app boot `GET /api/auth/profile`) and look for the
 * tell-tale shape of an "unsynced" account:
 *
 *   - Stripe knows about this user (stripeCustomerId or legacyStripeCustomerId set)
 *   - But our DB has no live subscription link (no subscriptionId on either account)
 *   - And subscriptionStatus is unset / "free" / "cancelled" / "incomplete"
 *
 * When detected we fire `reconcileUserCredits(userId, { lookbackDays: 7 })`
 * in the background. That helper is fully idempotent (UNIQUE constraint on
 * CreditTransaction.paymentSessionId) and self-corrects User.subscriptionTier
 * / Status / Credits / ExpireAt, so even running it on a user who is
 * legitimately free (e.g. paid one-time credits in the past, customer record
 * exists but no active sub) is a cheap no-op.
 *
 * Throttling: we keep a per-process Map of "last attempt per userId" and
 * skip if we attempted within the past hour. This prevents hammering Stripe
 * if the user repeatedly hits /auth/profile in quick succession. The map is
 * intentionally in-memory: it does not need to survive restarts (a restart
 * just means we try one more reconcile on next boot, still idempotent).
 *
 * Loud logging is on purpose: every detection event is a console.error so it
 * surfaces in log monitoring even if no human is staring at the dashboard.
 */

const lastAttemptByUser = new Map();
const THROTTLE_MS = 60 * 60 * 1000;
const DEFAULT_LOOKBACK_DAYS = 7;

/**
 * Pure detector. Returns true if this user "looks unsynced" — i.e. has a
 * Stripe customer record on either account but no active subscription link in
 * our DB.
 *
 * @param {{
 *   stripeCustomerId?: string | null,
 *   legacyStripeCustomerId?: string | null,
 *   stripeSubscriptionId?: string | null,
 *   legacyStripeSubscriptionId?: string | null,
 *   subscriptionStatus?: string | null,
 * }} user
 */
export function looksUnsyncedFromStripe(user) {
  if (!user) return false;
  const hasStripeCustomer = Boolean(
    user.stripeCustomerId || user.legacyStripeCustomerId,
  );
  if (!hasStripeCustomer) return false;

  const noSubLink =
    !user.stripeSubscriptionId && !user.legacyStripeSubscriptionId;
  if (!noSubLink) return false;

  const status = String(user.subscriptionStatus || "")
    .trim()
    .toLowerCase();
  // Anything that is not "active" / "trialing" / "past_due" is treated as a
  // sync candidate. past_due is explicitly excluded so we don't reconcile
  // every cycle a card fails — those are handled by the payment_failed path.
  const looksLikeFree =
    status === "" ||
    status === "free" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "incomplete" ||
    status === "incomplete_expired";
  return looksLikeFree;
}

/**
 * Fire-and-forget. Safe to call on every authenticated request. Cheap when
 * the user does not look unsynced. Throttled to once per hour per user when
 * they do.
 *
 * @param {object} user — must include id, email, and the four stripe id
 *   fields plus subscriptionStatus. Extra fields are ignored.
 * @param {{ lookbackDays?: number, reason?: string }} [opts]
 */
export function maybeReconcileUnsyncedUser(user, opts = {}) {
  try {
    if (!user || !user.id) return;
    if (!looksUnsyncedFromStripe(user)) return;

    const userId = user.id;
    const now = Date.now();
    const last = lastAttemptByUser.get(userId) || 0;
    if (now - last < THROTTLE_MS) return;
    lastAttemptByUser.set(userId, now);

    const customerHint =
      user.stripeCustomerId ||
      user.legacyStripeCustomerId ||
      "unknown-customer";
    const statusHint = user.subscriptionStatus || "null";
    const emailHint = user.email || "no-email";
    const reasonHint = opts.reason ? ` reason=${opts.reason}` : "";

    console.error(
      `⚠️ [stripe-sync-watchdog] DETECTED unsynced user ${userId} (${emailHint}) — ` +
        `stripeCustomerId=${customerHint}, subscriptionStatus=${statusHint}.${reasonHint} ` +
        `Firing background reconcileUserCredits(lookbackDays=${opts.lookbackDays || DEFAULT_LOOKBACK_DAYS}).`,
    );

    Promise.resolve()
      .then(() =>
        reconcileUserCredits(userId, {
          lookbackDays: opts.lookbackDays || DEFAULT_LOOKBACK_DAYS,
        }),
      )
      .then((result) => {
        if (result.totalGranted > 0) {
          console.error(
            `✅ [stripe-sync-watchdog] AUTO-RECOVERED user ${userId} (${emailHint}): ` +
              `${result.totalGranted} grants, +${result.creditsGranted} credits across ` +
              `${result.customers.length} customer(s) — root cause was a missed Stripe webhook.`,
          );
        } else {
          console.log(
            `[stripe-sync-watchdog] user ${userId} (${emailHint}) reconcile ran, ` +
              `nothing to grant (no missing CreditTransactions; user may genuinely be free).`,
          );
        }
      })
      .catch((err) => {
        console.error(
          `❌ [stripe-sync-watchdog] reconcile failed for ${userId} (${emailHint}): ${err?.message || err}`,
        );
      });
  } catch (e) {
    console.error(
      "[stripe-sync-watchdog] detector crashed (non-fatal):",
      e?.message || e,
    );
  }
}

/**
 * Test-only helper: reset the throttle Map between unit tests.
 */
export function _resetWatchdogThrottleForTests() {
  lastAttemptByUser.clear();
}
