# ModelClone — Full Project Handoff

**Stack:** Node.js + Express (backend `src/`), React 18 + Vite + TypeScript (frontend `client/src/`), PostgreSQL via Prisma ORM, Cloudflare R2 (primary storage), Cloudinary (fallback/legacy), JWT auth in HTTP-only cookies.

---

## 1. ARCHITECTURE OVERVIEW

```
client/src/          React 18 frontend (Vite, Wouter routing, Zustand + TanStack Query)
src/routes/          Express route files
src/controllers/     HTTP handler functions
src/services/        Business logic + 3rd party API wrappers
src/middleware/      authMiddleware, adminMiddleware, rateLimiters
src/utils/           r2.js, cloudinary helpers
prisma/schema.prisma Full DB schema
server/index.ts      App entry point, cron jobs, route mounting
```

### Route mounting (server/index.ts)
```
/api/*               → src/routes/api.routes.js        (main catch-all)
/api/stripe/*        → src/routes/stripe.routes.js
/api/stripe/webhook  → src/routes/stripe.webhook.js
/api/affiliate/*     → src/routes/affiliate.routes.js
/api/video-repurpose/* → src/routes/video-repurpose.routes.js
/api/viral-reels/*   → src/routes/viral-reels.routes.js
/api/admin/*         → src/routes/admin.routes.js
/api/img2img/*       → src/routes/img2img.routes.js
/api/nowpayments/*   → src/routes/nowpayments.routes.js
```

### Auth system
- **JWT tokens** in HTTP-only cookies (`accessToken` + `refreshToken`)
- `authMiddleware` — verifies JWT, attaches `req.user = { userId, email, isAdmin }`
- `adminMiddleware` — checks `req.user.isAdmin === true`
- Firebase auth supported (Google, email verify flow) via `firebase-admin`
- bcryptjs for password hashing
- 2FA supported (TOTP via `otplib`)
- Email verification required before full access

---

## 2. DATABASE SCHEMA (key tables)

### Users
```prisma
model User {
  id                    String
  email                 String   @unique
  name                  String?
  passwordHash          String?
  firebaseUid           String?  @unique
  isAdmin               Boolean  @default(false)
  isVerified            Boolean  @default(false)
  credits               Int      @default(0)    // legacy
  subscriptionCredits   Int      @default(0)    // from active subscription
  purchasedCredits      Int      @default(0)    // one-time purchases
  subscriptionStatus    String?                 // "active" | "canceled" | null
  subscriptionTier      String?                 // "starter" | "pro" | "business"
  stripeCustomerId      String?
  stripeSubscriptionId  String?
  hasUsedFreeTrial      Boolean  @default(false)
  onboardingCompleted   Boolean  @default(false)
  specialOfferEligible  Boolean  @default(true)
  firstSaleAt           DateTime?
  firstSaleEventType    String?
  affiliateBlocked      Boolean  @default(false)
}
```

### Models (AI face models)
```prisma
model SavedModel {
  id            String
  userId        String
  name          String
  photo1Url     String
  photo2Url     String?
  photo3Url     String?
  thumbnail     String?
  status        String    // "ready" | "generating" | "training"
  activeLoraId  String?   // currently active LoRA
  loras         TrainedLora[]
}
```

### LoRA system
```prisma
model TrainedLora {
  id            String
  modelId       String
  userId        String
  name          String
  status        String    // "pending" | "training" | "ready" | "failed"
  loraUrl       String?   // R2/Cloudinary URL of trained weights
  trainingImages LoraTrainingImage[]
}
model LoraTrainingImage {
  id      String
  loraId  String
  userId  String
  imageUrl String
}
```

### Generations
```prisma
model Generation {
  id            String
  userId        String
  modelId       String?
  type          String    // "image" | "video" | "face-swap" | "nsfw-image" | etc.
  status        String    // "pending" | "processing" | "completed" | "failed"
  resultUrl     String?
  creditsCost   Int
  prompt        String?
  metadata      Json?
}
```

### Credits audit
```prisma
model CreditTransaction {
  id              String
  userId          String
  amount          Int        // negative = deduction, positive = credit
  description     String
  paymentSessionId String?  @unique  // prevents double-processing
}
```

### Repurpose jobs
```prisma
model RepurposeJob {
  id      String   @id
  userId  String
  status  String   // pending | processing | done | error
  outputs RepurposeOutput[]
}
model RepurposeOutput {
  id      String
  jobId   String
  fileUrl String   // R2 public URL
}
```

### Viral Reels
```prisma
model ReelFinderProfile {
  id          String
  username    String  @unique
  scrapeGroup Int     @default(0)   // 0–5 rolling group
}
model Reel {
  id                 String
  profileId          String
  shortCode          String
  videoUrl           String?
  viralScore         Float
  scrapeTier         Int?
  lastScrapedAt      DateTime?
  viewCount          Int?
  likesCount         Int?
  commentsCount      Int?
  sharesCount        Int?
  viewsPerHourPrev   Float?
  momentumMultiplier Float?
}
model ScrapeLog { id, profileId, status, reelCount, createdAt }
```

### Affiliate
```prisma
model AffiliatePartner {
  id          String   @id
  code        String   @unique      // e.g. "MAXM9K2F"
  displayName String
  email       String   @unique
  isActive    Boolean
  clicks      AffiliateClick[]
  attributions AffiliateAttribution[]
  conversions AffiliateConversion[]
  withdrawals AffiliateWithdrawal[]
}
model AffiliateClick {
  affiliateId  String
  ipHash       String?
  fingerprintId String?
  referrer     String?
  createdAt    DateTime
}
model AffiliateAttribution {
  userId      String   @unique   // one per user
  affiliateId String
  expiresAt   DateTime           // 7 days
}
model AffiliateConversion {
  userId        String
  affiliateId   String
  eventType     String           // "checkout"
  eventRef      String  @unique  // paymentIntentId or subscriptionId
  grossUsd      Decimal
  commissionUsd Decimal          // grossUsd × 0.15
  status        String           // "pending" | "paid" | "rejected"
}
model AffiliateWithdrawal {
  affiliateId   String
  amountUsd     Decimal
  cryptoChain   String
  cryptoAddress String
  status        String           // "pending" | "paid" | "rejected"
  txHash        String?
  adminNote     String?
}
```

---

## 3. CREDIT SYSTEM

### Three credit buckets (all checked together)
| Bucket | Field | Source |
|--------|-------|--------|
| Legacy | `credits` | Old system / manual admin grants |
| Subscription | `subscriptionCredits` | Renewed monthly with subscription |
| Purchased | `purchasedCredits` | One-time credit packs |

Deduction order: purchasedCredits first → subscriptionCredits → legacy credits.

### Generation credit costs
| Type | Cost |
|------|------|
| SFW image (Seedream) | 1 credit |
| SFW image (Nano Banana Pro) | 2 credits |
| NSFW image | 3 credits |
| img2img (face swap image) | 3 credits |
| SFW video (Kling 5s) | 20 credits |
| SFW video (Kling 10s) | 25 credits |
| NSFW video (WAN 5s) | 25 credits |
| NSFW video (WAN 8s) | 40 credits |
| Video extend (per 5s) | 25 credits |
| Prompt-to-video 5s | 20 credits |
| Prompt-to-video 10s | 25 credits |
| Voice (ElevenLabs) | ~15 credits (scales with text) |

Credits deducted **upfront**, refunded atomically on failure. All transactions logged in `CreditTransaction`.

### Subscription tiers & pricing
| Tier | Monthly | Annual | Credits/month |
|------|---------|--------|---------------|
| Starter | $29 | $289/yr | 290 |
| Pro | $79 | $787/yr | 890 |
| Business | $199 | $1,982/yr | 2,490 |

One-time credit packs: **$0.12/credit** (via Stripe Payment Intent).
Special offer (onboarding): **~$14** for AI model creation + 25 bonus credits.

---

## 4. AI GENERATION PIPELINE

### SFW Image Generation
- **API:** kie.ai (`src/services/kie.service.js`)
- **Models:** Seedream 4.5 Edit, Nano Banana Pro
- **Flow:** POST → deduct credits → queue job → poll status → save to R2 → update Generation record
- **Prompt enhancement:** GPT-4o-mini (OpenAI) auto-improves user prompts

### NSFW Image Generation
- **API:** kie.ai or WaveSpeed (depending on config)
- **Flow:** Same queue/poll pattern
- **Logical constraints engine:** prevents contradictory chip combos (e.g., "standing" + "lying")
- LoRA model injected into prompt if `activeLoraId` set on SavedModel

### SFW Video Generation
- **API:** kie.ai — Kling 2.6 Motion Control (1080p) or Kling 2.6 Image-to-Video
- **Prompt-to-video** also via kie.ai

### NSFW Video Generation
- **API:** WaveSpeed — WAN 2.2 Spicy (`src/services/wavespeed.service.js`)
- **Video extend:** chainable, 5s or 8s segments

### Face Swap (Image)
- **API:** WaveSpeed face-swap endpoint

### Face Swap (Video)
- **API:** WaveSpeed face-swap video

### img2img (RunPod custom Docker)
- **Flow:** Two-step — (1) JoyCaption extracts scene description, (2) img2img generates output
- **Endpoint:** `RUNPOD_IMG2IMG_ENDPOINT` env var
- **Service:** `src/services/img2img.service.js`
- **Routes:** `src/routes/img2img.routes.js`

### Generation poller
- Background service (`src/services/generation-poller.service.js`) polls all `pending`/`processing` generations every 30s
- Handles status updates, result URL saving, credit refunds on failure

### Request queue
- `src/services/queue.service.js` — 20 concurrent slots max
- Prevents API rate-limit overload

---

## 5. AUTH FLOWS

### Email flow
1. `POST /api/auth/signup` → hashes password, creates User (unverified), sends 6-digit code via email
2. `POST /api/auth/verify-email` → verifies code → marks User verified → issues JWT → calls `claimAffiliateFromCookie`
3. `POST /api/auth/login` → checks password → issues JWT → calls `claimAffiliateFromCookie`

### Firebase flow (Google + email)
1. `POST /api/auth/firebase-signup` → Firebase token → creates/finds User → sends verify code
2. `POST /api/auth/verify-firebase-email` → verifies code → issues JWT → calls `claimAffiliateFromCookie`
3. `POST /api/auth/google` → Firebase Google token → auto-verified → issues JWT → calls `claimAffiliateFromCookie`

### Token system
- `accessToken` — short-lived (15min), HTTP-only cookie
- `refreshToken` — long-lived (30 days), HTTP-only cookie
- `POST /api/auth/refresh` — issues new access token

### Anti-abuse
- FingerprintJS device fingerprinting on signup
- IP tracking
- Rate limiters: `authLimiter`, `signupLimiter`, `generationLimiter`, `modelsLimiter`

---

## 6. STRIPE PAYMENT FLOWS

All payment routes: `src/routes/stripe.routes.js`

### Subscription (embedded Stripe checkout)
1. `POST /api/stripe/create-embedded-subscription` → creates Stripe subscription with `payment_behavior: 'default_incomplete'` → returns `clientSecret`
2. Frontend collects card via Stripe Elements
3. `POST /api/stripe/confirm-subscription` → verifies payment, adds `subscriptionCredits`, records `CreditTransaction`, fires `recordAffiliateConversion`

### One-time credit purchase (embedded)
1. `POST /api/stripe/create-payment-intent` → creates PaymentIntent → returns `clientSecret`
2. `POST /api/stripe/confirm-payment` → verifies, adds `purchasedCredits`, fires `recordAffiliateConversion`

### Special offer (onboarding, ~$14)
1. `POST /api/stripe/create-special-offer-intent` → creates PaymentIntent
2. `POST /api/stripe/confirm-special-offer` → creates SavedModel, awards 25 bonus credits, fires `recordAffiliateConversion`, generates 2 poses in background

### Other Stripe routes
- `GET /api/stripe/subscription-status` — current plan + renewal date
- `POST /api/stripe/cancel-subscription` — cancels at period end
- `POST /api/stripe/create-portal-session` — Stripe billing portal URL

### Webhooks
- `src/routes/stripe.webhook.js` — handles `invoice.payment_succeeded`, `customer.subscription.deleted`, etc.
- NowPayments webhook: `src/routes/nowpayments.routes.js` (crypto payments)

---

## 7. ONBOARDING FLOW

1. New user → `/onboarding` page
2. Special offer shown ($14 for AI model + 25 credits)
3. `POST /api/onboarding/lock-offer` — prevents offer from expiring mid-checkout
4. After payment: `confirm-special-offer` creates model, starts background pose generation
5. `onboardingCompleted = true` set on User
6. User lands on dashboard with their first model ready

---

## 8. MULTI-LORA ARCHITECTURE

- Each `SavedModel` can have multiple `TrainedLora` records
- Users pick training images from a shared pool (`LoraTrainingImage`)
- `activeLoraId` on `SavedModel` points to the currently active LoRA
- Active LoRA weights injected into NSFW generation prompts

### LoRA endpoints (in `api.routes.js`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/nsfw/lora/create` | Create new LoRA record |
| GET | `/api/nsfw/loras/:modelId` | List LoRAs for model |
| POST | `/api/nsfw/lora/set-active` | Set active LoRA |
| DELETE | `/api/nsfw/lora/:loraId` | Delete LoRA |
| POST | `/api/nsfw/train-lora` | Start LoRA training |
| GET | `/api/nsfw/training-status/:modelId` | Poll training status |

---

## 9. VIDEO REPURPOSER

**Requires:** active subscription. No credits.

### Flow
1. `POST /api/video-repurpose/upload` — upload video → `/tmp/repurpose-uploads/`
2. `POST /api/video-repurpose/generate` — pick filters + metadata options → FFmpeg job queued
3. `GET /api/video-repurpose/jobs/:jobId` — poll status
4. `GET /api/video-repurpose/jobs/:jobId/download/:fileName` — download output
5. Completed outputs → uploaded to R2, saved to `RepurposeJob`/`RepurposeOutput` DB

### FFmpeg filters applied
Brightness, saturation, hue shift, speed change, blur, noise, crop/pad, audio pitch shift

### Metadata spoofing (exiftool)
GPS coordinates, device model, timestamps — makes each copy look like a unique file

### Limits
- 2 concurrent FFmpeg jobs max (in-memory queue)
- 3 active jobs per user
- 5 copies per job
- Last 20 jobs kept per user — older auto-deleted (R2 + DB)

### Key files
- `src/routes/video-repurpose.routes.js` — all routes + FFmpeg/exiftool logic
- `src/services/video-repurpose.service.js` — filter chain builder
- `client/src/pages/VideoRepurposerPage.jsx`

---

## 10. VIRAL REEL FINDER

**Requires:** active subscription. No credits.

### Viral Score v3 formula
```
score = (ratio_score × 0.5) + (engagement_score × 0.3)
      + recency_multiplier + velocity_bonus + momentum_multiplier
      + share_bonus + audio_trend_bonus + absolute_views_bonus
```
- Min 500 views threshold to filter micro-reels
- Trimmed mean avgViews (drops top 10% outliers)

### 4-Tier scraping
| Tier | Trigger | Condition |
|------|---------|-----------|
| 1 Hot | Every 8h | viralScore > 70, < 48h old |
| 2 Warm | Daily 7am | viralScore 30–70, < 96h old |
| 3 Cold | Never | score < 30 or > 96h |
| 4 Discovery | Daily 6am | 1 of 6 rolling groups of profiles |

### Cleanup
- Daily 3am: delete reels > 10 days old from DB + R2

### External dep
- **Apify** `apify/instagram-reel-scraper` — `APIFY_API_TOKEN` env var required

### Key files
- `src/services/viral-reels.service.js` — scoring, scraping, cleanup
- `src/routes/viral-reels.routes.js`
- `client/src/pages/ViralReelFinderPage.jsx`

---

## 11. AFFILIATE SYSTEM

### Rules
- 15% commission, first sale only per referred user
- 7-day attribution window
- Self-referral blocked (email match check)
- Min withdrawal: $100
- Race-condition-safe (Prisma transactions)

### Full flow
```
1. /r/:code visited → cookie aff_ref=CODE set (7d) + AffiliateClick recorded
2. User signs up/logs in → claimAffiliateFromCookie() → AffiliateAttribution created (7d expiry)
3. User pays → recordAffiliateConversion() called (fire-and-forget in stripe routes)
   → checks attribution exists + not expired + not self-referral + first sale
   → creates AffiliateConversion (commissionUsd = gross × 0.15)
4. Admin views /admin → AffiliateAdminPanel shows all partners + balance
5. User requests withdrawal (min $100) → AffiliateWithdrawal created
6. Admin marks paid → balance resets to $0 in UI
```

### Balance display
```
availableBalance = totalCommissions − totalWithdrawn(non-rejected)
```
"Earned" in UI = `availableBalance` (resets to 0 after payout)

### Auto-registration
Opening affiliate modal → `getMe()` called → if not registered, `register()` auto-called → user lands directly on their dashboard

### Key files
- `src/services/affiliate.service.js`
- `src/controllers/affiliate.controller.js`
- `src/routes/affiliate.routes.js`
- `client/src/pages/DashboardPage.jsx` (modal UI)
- `client/src/pages/AdminPage.jsx` (`AffiliateAdminPanel` component)
- `client/src/pages/AffiliateRedirectPage.jsx` (handles `/r/:code`)

### Security
- `POST /api/affiliate/model-purchase` — `INTERNAL_AFFILIATE_SECRET` header auth (not JWT)
- `AFFILIATE_HASH_SALT` — IP hashing
- `AFFILIATE_COOKIE_DOMAIN` — cross-subdomain cookie (production)

---

## 12. ADMIN PANEL

Route: `/admin` — `isAdmin === true` required (checked both FE + BE)

### Admin capabilities
- Platform stats (users, generations, revenue)
- User list + credit adjustments (`POST /api/admin/users/:userId/credits`)
- View/manage user models + NSFW overrides
- Send marketing emails
- Send promo codes (50% off)
- Assign LoRA to model
- Bulk import gallery
- DB backup / credit restore
- Affiliate partners overview + withdrawal management
- Reel finder profile management + manual scrape triggers

### Admin auth (backend)
`adminMiddleware` checks `req.user.isAdmin`. For `/api/admin/*` routes: also accepts `X-Admin-Secret` header (= `ADMIN_SECRET` env var) as alternative.

---

## 13. OTHER FEATURES

### Course system
- `/course` page — video course content
- `POST /api/course/complete-video` — marks video as watched

### IG Downloader
- `src/routes/ig-downloader.routes.js` — download Instagram content

### Voice generation (ElevenLabs)
- `src/services/elevenlabs.service.js`
- Cost: ~15 credits (scales with text length)

### Job Board
- `client/src/pages/JobBoardPage.jsx` — static job listings page

---

## 14. FRONTEND STRUCTURE

### Routing (Wouter, in `client/src/App.jsx`)
| Path | Page |
|------|------|
| `/` | LandingPage |
| `/login` | LoginPage |
| `/signup` | SignupPage |
| `/verify-email` | VerifyEmailPage |
| `/dashboard` | DashboardPage |
| `/generate` | GeneratePage (SFW) |
| `/nsfw` | NSFWPage |
| `/models` | ModelsPage |
| `/history` | HistoryPage |
| `/repurposer` | VideoRepurposerPage |
| `/reel-finder` | ViralReelFinderPage |
| `/settings` | SettingsPage |
| `/course` | CoursePage |
| `/onboarding` | OnboardingPage |
| `/admin` | AdminPage |
| `/r/:code` | AffiliateRedirectPage |

### State management
- **Zustand** — auth store (`client/src/store/index.js`) — user, credits
- **TanStack Query** — server state, generation polling
- **React Hook Form + Zod** — all forms

### Generation tracking
- `useGenerationTracker` hook — polls all active generations, unified UI for all types

### Mobile navigation
- Bottom tabs: Home, Generate, NSFW, Reels, More (hamburger: Models, Courses, History, Repurposer, Settings)

---

## 15. ENV VARS REFERENCE

| Var | Used for |
|-----|----------|
| `DATABASE_URL` | PostgreSQL (Neon serverless) |
| `JWT_SECRET` | JWT signing |
| `SESSION_SECRET` | Session management |
| `STRIPE_SECRET_KEY` | Stripe payments (prod) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `TESTING_STRIPE_SECRET_KEY` | Stripe (dev/test) |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe frontend (prod) |
| `VITE_STRIPE_TEST_PUBLIC_KEY` | Stripe frontend (dev) |
| `WAVESPEED_API_KEY` | NSFW video + face swap |
| `KIE_API_KEY` | SFW image/video generation |
| `FAL_API_KEY` | Fal.ai (backup generation) |
| `REPLICATE_API_TOKEN` | Replicate (backup) |
| `RUNPOD_API_KEY` | RunPod serverless |
| `RUNPOD_IMG2IMG_ENDPOINT` | Custom img2img Docker pod |
| `RUNCOMFY_API_TOKEN` | RunComfy workflows |
| `ANTHROPIC_API_KEY` | Claude (AI features) |
| `XAI_API_KEY` | xAI Grok |
| `ELEVENLABS_API_KEY` | Voice generation |
| `CLOUDINARY_*` | Cloudinary storage (legacy) |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 |
| `R2_ACCOUNT_ID` | Cloudflare R2 |
| `R2_BUCKET_NAME` | Cloudflare R2 |
| `R2_PUBLIC_URL` | R2 public base URL |
| `APIFY_API_TOKEN` | Instagram scraping (Reel Finder) |
| `RESEND_API_KEY` | Email sending |
| `SENDGRID_API_KEY` | Email (alternative) |
| `NOWPAYMENTS_API_KEY` | Crypto payments |
| `NOWPAYMENTS_IPN_SECRET` | Crypto webhook |
| `AFFILIATE_HASH_SALT` | Affiliate IP hashing |
| `INTERNAL_AFFILIATE_SECRET` | Server-to-server affiliate calls |
| `AFFILIATE_COOKIE_DOMAIN` | Affiliate cross-subdomain cookie |
| `ADMIN_SECRET` | Admin endpoint header auth |
| `VITE_FIREBASE_API_KEY` | Firebase frontend |
| `VITE_FIREBASE_APP_ID` | Firebase frontend |
| `VITE_FIREBASE_PROJECT_ID` | Firebase frontend |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK |
| `CIVITAI_API_KEY` | CivitAI (model assets) |
| `VITE_APP_URL` | App base URL (production only, for affiliate links) |
