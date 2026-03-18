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
| **invoice.payment_succeeded** | **Rebills:** When a user is automatically charged for the next period, Stripe sends this. We match the invoice’s subscription to our user, then add renewal credits and extend plan. |
| checkout.session.completed | First-time checkout (one-time or subscription). |
| payment_intent.succeeded | One-time payments, special offers. |
| customer.subscription.deleted | Cancel subscription → clear subscription state and credits. |
| customer.subscription.updated | If status is canceled/unpaid → clear subscription state. |
| charge.refunded | Refund → deduct credits and handle referral clawback. |

For **subscription rebills**, the critical one is **invoice.payment_succeeded**.

## What we do on rebill (invoice.payment_succeeded)

1. **Stripe sends:** `invoice` object with:
   - `invoice.subscription` (subscription ID, e.g. `sub_xxx`)
   - `invoice.id` (transaction/invoice ID, unique per rebill)
   - `invoice.billing_reason` (e.g. `subscription_cycle` for renewals)
   - `invoice.amount_paid`, etc.

2. **We:**
   - Resolve **subscription ID** (handle both string and expanded object).
   - Find **user** by `stripeSubscriptionId` (or by subscription metadata `userId` if not yet set).
   - Get **credits** from subscription `metadata.credits`, or fallback to the amount from the first grant for that subscription.
   - Idempotency: if we already have a `CreditTransaction` with `paymentSessionId = invoice.id`, we skip (no double credit).
   - Create a `CreditTransaction` and **increment** the user’s `subscriptionCredits`, set `creditsExpireAt` to end of the new period.

So every time Stripe rebills the user, we get the callback with the subscription and invoice (tx id), match the user, and assign plan renewal + credits.

## Env var

- **STRIPE_WEBHOOK_SECRET**  
  Signing secret for the webhook endpoint (from Stripe Dashboard → Webhooks → Select endpoint → Signing secret).  
  Required in production; without it we reject webhook requests.

## Quick check

- **GET** `https://YOUR_API_DOMAIN/api/stripe/webhook`  
  Returns a short JSON description of the callback URL and which events we use (for ops/support).
