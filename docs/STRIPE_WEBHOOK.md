# Stripe webhook (rebill / subscription callback)

Stripe calls our **callback URL** whenever events occur (e.g. payment succeeded, subscription renewed). We use it to match the user and assign **plan renewal + credits**.

## Callback URL

Configure this exact URL in **Stripe Dashboard → Developers → Webhooks → Add endpoint**:

```
https://YOUR_API_DOMAIN/api/stripe/webhook
```

Examples:

- Production: `https://api.modelclone.app/api/stripe/webhook` (or whatever your API base URL is)
- Test/local: use Stripe CLI or ngrok and point to your local URL, e.g. `https://xxxx.ngrok.io/api/stripe/webhook`

**Method:** `POST`  
**Content-Type:** `application/json`

Stripe sends a signed payload. We verify it with `STRIPE_WEBHOOK_SECRET` and then process the event.

## Events we use (subscribe these)

| Event | Purpose |
|-------|--------|
| **invoice.payment_succeeded** | **Rebills:** When Stripe charges for the next billing period, we replace `subscriptionCredits` with the new allotment (and roll any unused leftovers into `purchasedCredits` first) and extend `creditsExpireAt`. |
| **invoice.payment_failed** | **Dunning:** Stamp `subscriptionStatus="past_due"`. **Credits, tier, expiry, and `stripeSubscriptionId` are preserved** so the user keeps service while Stripe Smart Retries continue. Final cancellation happens via `customer.subscription.deleted` only after Stripe exhausts retries. |
| checkout.session.completed | First-time checkout (one-time or subscription). |
| payment_intent.succeeded | One-time payments, special offers, embedded-checkout safety nets. |
| customer.subscription.deleted | Cancel subscription → clear subscription state and credits. |
| customer.subscription.updated | `active`/`trialing` → repair primary fields and self-heal zero-credit zombies; `canceled`/`unpaid`/`incomplete_expired` → clear subscription state; `past_due` → status-only (credits preserved); `paused` is ignored at this branch (handled by the explicit pause event). |
| **customer.subscription.paused** | Stamp `subscriptionStatus="paused"`, credits preserved. |
| **customer.subscription.resumed** | Stamp `subscriptionStatus="active"`, recompute `creditsExpireAt` from the new period end, credits preserved (the next `invoice.payment_succeeded` grants). |
| charge.refunded | Refund → deduct credits and handle referral clawback. |

Every delivery is also recorded once in the `StripeWebhookEvent` table (`event.id` as primary key); redeliveries P2002 and short-circuit with HTTP 200, so handlers are idempotent end-to-end regardless of side effects.

For **subscription renewals**, the critical event is **`invoice.payment_succeeded`**.

## Billing frequency vs credits (monthly vs annual)

- **Monthly plan** (`Stripe` recurring interval `month`): Stripe invoices **monthly**. Each paid invoice (`billing_reason` usually `subscription_cycle`) grants **`subscription.metadata.credits`** and **increments** `subscriptionCredits`.
- **Annual plan** (`Stripe` recurring interval `year`): Stripe invoices **once per year**. Each paid renewal grants the **same `metadata.credits` value** as the monthly tier (e.g. 2900 for Starter) **once per invoice** — i.e. **one grant per year**, not twelve. Product copy that describes “per month” refers to the **credit bundle size** matching the monthly tier, not to twelve separate Stripe invoices per year.

**Credit scaling:** `src/utils/creditUnits.js` — `normalizeCreditUnits()` maps legacy metadata (≤1000) to the current scale. All Stripe paths (checkout, webhook, `/confirm-subscription`, admin recovery) use this helper.

**Plan changes (new checkout / confirm / verify-session):** When we **replace** `subscriptionCredits` with a new plan’s grant, any **unused** balance in the subscription pool is first moved into **`purchasedCredits`** (non-expiring). Total credits stay the same; users no longer “lose” leftover sub credits when switching tiers. Implemented via `rolloverSubPoolToPurchasedUpdate()` in `src/services/credit.service.js`.

**Known gap:** Portal **in-place** plan changes can emit `invoice.payment_succeeded` with `billing_reason: subscription_update` (proration). We do not infer credits from small proration amounts; renewal grants still use `subscription_cycle` + metadata / amount mapping. Ensure Stripe **subscription metadata** (`credits`, `tierId`) stays accurate if you change prices in the Dashboard, or extend code to handle `subscription_update` explicitly.

**Subscription metadata (hosted + embedded):** `userId`, `tierId`, `credits`, and **`billingCycle`** (`monthly` \| `annual`) on the subscription object. Older subs may omit `billingCycle`; code falls back to `subscription.items[0].plan.interval` (`month` → monthly, `year` → annual).

## What we do on rebill (`invoice.payment_succeeded`)

1. **Stripe sends:** `invoice` with:
   - `invoice.subscription` (subscription ID, or expanded object)
   - `invoice.id` (unique per charge — we use this for idempotency)
   - `invoice.billing_reason` (e.g. `subscription_create` first time, `subscription_cycle` for renewals)
   - `invoice.amount_paid`, etc.

2. **We:**
   - Resolve **subscription ID** (string or expanded object).
   - Find **user** in this order: `stripeSubscriptionId` (account-aware) → `stripeCustomerId` → `subscription.metadata.userId` (last resort). The customer-id fallback catches users whose `stripeSubscriptionId` was previously cleared by older dunning handlers.
   - **Credits:** trust `normalizeCreditUnits(subscription.metadata.credits)` first (authoritative even with deep-discount coupons); otherwise infer from invoice amount (`subscription_cycle` only), or fall back to the first positive `CreditTransaction` for `paymentSessionId = subscriptionId`, or finally to the tier-pricing table for the resolved `(tierId, billingCycle)`.
   - **Skip duplicate first payment:** if `billing_reason === subscription_create` and a transaction already exists with `paymentSessionId = subscriptionId`, skip (avoids double credit with `checkout.session.completed` / `/confirm-subscription`).
   - **Idempotency per invoice:** if a `CreditTransaction` exists with `paymentSessionId = invoice.id`, skip.
   - In one transaction, insert a renewal `CreditTransaction`, **roll any leftover `subscriptionCredits` into `purchasedCredits`** (via `rolloverSubPoolToPurchasedUpdate`), then **replace** `subscriptionCredits` with the new period's allotment and set `creditsExpireAt` from the Stripe invoice period (fallback: +1 month or +1 year from "now").

## Subscription lifecycle (what each event does to `User`)

| Stripe event | `subscriptionStatus` after | Credits / `creditsExpireAt` / `stripeSubscriptionId` |
|---|---|---|
| `checkout.session.completed` (subscription, paid) | `"active"` | Granted + expiry set + `stripeSubscriptionId` set |
| `payment_intent.succeeded` (subscription-embedded) | `"active"` | Safety net grant (billing cycle derived from the Stripe subscription, not PI metadata) |
| `invoice.payment_succeeded` (`subscription_create`) | `"active"` | First-cycle safety net if confirm-subscription missed; otherwise no-op |
| `invoice.payment_succeeded` (`subscription_cycle`) | `"active"` | Rollover leftovers → `purchasedCredits`; replace `subscriptionCredits` with new allotment; extend `creditsExpireAt` |
| `invoice.payment_failed` | `"past_due"` | **Preserved.** No cancel, no wipe. Stripe Smart Retries continue. |
| `customer.subscription.updated` status `active`/`trialing` | `"active"`/`"trialing"` | Repair `stripeSubscriptionId` / tier / cycle; self-heal grant if credits=0 AND expiry=null |
| `customer.subscription.updated` status `past_due` | `"past_due"` | **Preserved.** Status-only stamp. |
| `customer.subscription.updated` status `canceled`/`unpaid`/`incomplete_expired` | `"cancelled"` | Wiped (tier/credits/expiry/`stripeSubscriptionId` cleared) |
| `customer.subscription.paused` | `"paused"` | Preserved. Next `invoice.payment_succeeded` after resume grants. |
| `customer.subscription.resumed` | `"active"` | Preserved; `creditsExpireAt` recomputed from new period end. No grant — the next paid invoice handles that. |
| `customer.subscription.deleted` | `"cancelled"` | Wiped. **Only path** to a terminal cancellation. |

**Stale-event protection:** every cancellation/dunning path runs `classifySubscriptionForUser(user, account, subscriptionId)`. If the subscription is no longer the user's primary (typical upgrade race), the handler ignores the event — never wipes brand-new sub credits. `legacy-slot` events only clear the legacy-id columns.

**In-app cancel (intentional behavior — confirmed 2026-05-16):** the `cancel-subscription` route in `src/routes/stripe.routes.js` cancels the Stripe subscription **immediately** and wipes `subscriptionCredits`, `creditsExpireAt`, `subscriptionTier`, and `subscriptionBillingCycle` in the same transaction. This is a deliberate **revoke-on-cancel** policy — when a user clicks "Cancel Subscription" in-app they are choosing to end access right now, not at period end. Use cases:

- User wants to immediately stop being on the plan (e.g. about to dispute a charge, or wants to downgrade and re-subscribe instantly).
- User is troubleshooting and wants a clean slate.

The admin refund flow (`src/controllers/admin.controller.js`) instead uses `cancel_at_period_end: true` because admin-initiated refunds typically come with a service-quality complaint and the customer should keep the time they've already paid for. The two flows are **intentionally different** — do not "fix" the inconsistency without a fresh product decision.

If you ever need to switch the in-app flow to period-end cancellation: change `stripe.subscriptions.cancel(activeSubId)` to `stripe.subscriptions.update(activeSubId, { cancel_at_period_end: true })`, stamp `subscriptionCancelledAt = new Date(subscription.current_period_end * 1000)`, and DELETE the credit/tier/cycle/expiry wipe — let `customer.subscription.deleted` handle the terminal state.

## Env var

- **STRIPE_WEBHOOK_SECRET**  
  Signing secret for the webhook endpoint (from Stripe Dashboard → Webhooks → Select endpoint → Signing secret).  
  Required in production; without it we reject webhook requests.

## Quick check

- **GET** `https://YOUR_API_DOMAIN/api/stripe/webhook`  
  Returns a short JSON description of the callback URL and which events we use (for ops/support).
