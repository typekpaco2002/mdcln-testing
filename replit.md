# ModelClone - AI Face Cloning SaaS Platform

## Replit: get latest code (fresh pull / overwrite workspace)

If the workspace is **not** a git repo, or you want to **replace everything** with the GitHub repo (no DB changes):

```bash
# 1. Remove existing origin if present, then set origin with auth (use a GitHub PAT in the URL)
git remote remove origin 2>/dev/null || true
git remote add origin https://YOUR_GITHUB_TOKEN@github.com/mconqeuroror/mdclncdbs.git

# 2. Fetch and force main to match remote (overwrites local files)
git fetch origin main
git checkout -B main origin/main

# 3. Install and run
npm install
npm run dev
```

**Token:** Create a [GitHub Personal Access Token](https://github.com/settings/tokens) (repo scope). Put it in Replit Secrets as `GITHUB_TOKEN`, then run:
```bash
git remote remove origin 2>/dev/null || true
git remote add origin "https://${GITHUB_TOKEN}@github.com/mconqeuroror/mdclncdbs.git"
git fetch origin main
git checkout -B main origin/main
npm install
npm run dev
```

If you already have a working repo and just want to pull latest:
```bash
git fetch origin main && git reset --hard origin/main
npm install
npm run dev
```

**White screen fix:** This repo uses `main.jsx` as entry and `src/server.js` for API routes. If you had a template with `main.tsx` / duplicate `.tsx` files or a server that didn’t load `src/server.js`, you’d get a white screen (e.g. `/api/brand` returning HTML). A clean pull from this repo fixes that.

---

## Overview
ModelClone is a full-stack SaaS platform enabling users to create AI models of their faces from three uploaded photos. Users can then utilize a credit-based system to generate custom content, including images, videos, and face swaps. The project's vision is to become a leading AI-powered content creation tool, with future plans for cryptocurrency payment integration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React 18, Vite, TypeScript, and Wouter for routing. State management is handled by Zustand (authentication) and TanStack Query (server state). React Hook Form with Zod validates forms. Tailwind CSS, Shadcn UI, and Framer Motion are used for styling and animations. Authentication relies on JWT with HTTP-only cookies. A `useGenerationTracker` hook manages generation status updates, providing a unified UI/UX.

### Backend
The backend is an Express.js (Node.js) server. It uses PostgreSQL with Prisma ORM. Authentication employs `bcryptjs` and JWT. Cloudinary stores assets. AI generation is powered by WaveSpeed API (face-swapping, AI video) and kie.ai API (SFW image generation). A request queue limits concurrent AI API calls. A robust credit system ensures atomic deductions and refunds. An anti-abuse system utilizes FingerprintJS, IP tracking, and email verification. AI-powered prompt enhancement (GPT-4o-mini) and a logical constraints engine prevent contradictory content generation. SFW identity generation supports a two-step Grok Vision flow for analyzing reference images and injecting model names into prompts. The xAI API (Grok) is used for image analysis, prompt engineering, LoRA strength detection, and appearance auto-detection.

### Multi-LoRA and Training Pipeline
The platform supports multiple trained LoRA models per user, managed by a `TrainedLora` table. Training images are captioned using Grok vision (`grok-3-mini`) following Z-Image LoRA best practices, with captions included in `.txt` files alongside images in a ZIP for training. Failed LoRA trainings auto-refund credits (75 standard / 150 pro) both on fal.ai FAILED status detection and via the stuck training healing job.

### Draft Task Persistence
In-progress generation setups are automatically saved to the database for each feature (e.g., SFW image, SFW video, NSFW) per user. Draft images are uploaded to R2. Drafts auto-save on state changes (debounced) and auto-delete upon successful generation.

### Database Schema
The database includes tables for `Users` (authentication, credits, Stripe, referrals), `Models` (user face models), `TrainedLora` (trained LoRA models), `LoraTrainingImage` (training images), `Generations` (AI generation requests), `CreditTransactions`, `DraftTask`, `ReelFinderProfile`, `Reel`, `ScrapeLog`, `ReferralCommission`, `ReferralPayoutRequest`, `AdminAuditLog`, `AppBranding`, and telemetry tables (`ApiRequestMetric`, `TelemetryEdgeEvent`, `SystemHealthMetric`, `ApiEndpointHealthSnapshot`).

### Referral System
An internal referral system tracks `ReferralCommission` and `ReferralPayoutRequest`. Users receive a unique `referralCode`, and referred users are tracked. Payout requests support USDT (Solana) with admin approval.

### Telemetry System
The system captures API request metrics, edge events, system health snapshots, and endpoint health checks via middleware and services.

### URL Validation
SSRF prevention is implemented using a whitelist of `ALLOWED_URL_DOMAINS` for various external services.

### Video Repurposer Feature
This feature allows users to create variations of social media reels using **server-side** FFmpeg for visual/audio filters and exiftool for metadata spoofing. All encoding runs on your backend server (not the user's machine). It requires an active subscription and saves completed jobs to R2 and a database, with a retention limit of 20 jobs per user. Compare files are auto-cleaned after 30 minutes via the TTL interval cleaner. **FFmpeg must be installed on the server** (e.g. `apt install ffmpeg` on Linux) or set `FFMPEG_PATH` and `FFPROBE_PATH` to the full paths to the binaries; otherwise jobs will fail immediately with a clear error instead of hanging at "Starting FFmpeg...".

### Viral Reel Finder Feature
This feature identifies top-performing Instagram reels from tracked profiles using a composite viral score algorithm (Viral Score v3). It employs a 4-tier scraping system based on reel virality and age for efficient data collection.

### Subscription Lifecycle & Stale State Protection
Stripe subscription status is synced to prevent stale database entries. A manual `sync-subscription` endpoint is available. Both `/create-checkout-session` and `/create-embedded-subscription` perform live Stripe sync before the purchase guard. Legacy billing-cycle NULL blocks also handle `resource_missing` by clearing stale data instead of returning 503.

### Special Offer Webhook Safety Net
The `payment_intent.succeeded` webhook acts as a fallback for special offer model creation, ensuring model creation and credit awards even if frontend calls fail. All `JSON.parse` calls on Stripe metadata are wrapped in try/catch to prevent webhook crashes from truncated metadata.

### Embedded Subscription Webhook Safety Net
For embedded subscriptions (in-page card payment), metadata is copied to both the Stripe Subscription AND its underlying Payment Intent during creation. This ensures three independent server-side paths can award credits (any one succeeding is enough): (1) `/confirm-subscription` frontend call, (2) `payment_intent.succeeded` webhook, (3) `invoice.payment_succeeded` webhook with subscription metadata fallback. All paths use `paymentSessionId` unique constraints (P2002) to prevent double-awarding.

### Healing Mechanisms
Background jobs are implemented to heal stuck `SavedModel` records (stuck in 'generating' for >15 minutes) and `TrainedLora` records (stuck in 'training' for >2 hours). Stuck LoRA healing also auto-refunds credits (75 standard / 150 pro based on `trainingMode`).

### Credit System Hardening (March 2025)
- `checkAndExpireCredits` uses atomic `updateMany` + `findUnique` (no interactive transaction) to minimize connection pool pressure
- Database connection pool increased from 10 to 25 (`connection_limit=25` in `src/lib/prisma.js`)
- `refundCredits` and `refundGeneration` retry up to 3 times on transient DB errors (pool exhaustion, connection resets) — non-transient errors fail immediately to prevent double-crediting
- `deductCreditsTx` includes inline credit expiration check for callers that don't pre-call `checkAndExpireCredits` (e.g., NSFW training flows)
- Advanced generation endpoint (`/generate/advanced`) has proper refund tracking with variables declared outside try/catch for safe error handling
- Generation poller marks failed refunds as CRITICAL with `creditsRefunded: false` for manual recovery

### File Type Validation (March 2025)
- All generation endpoints validate image/video URLs before deducting credits
- Supported image formats: JPG, PNG, WebP
- Supported video formats: MP4, WebM, MOV
- Unsupported formats (HEIC, BMP, GIF, TIFF, SVG, etc.) return 400 with user-friendly message
- Validation utility: `src/utils/fileValidation.js` — `validateImageUrl()`, `validateVideoUrl()`, `validateImageUrls()`
- R2 mirrorToR2 downgrades 403/404/410 errors to warnings (non-fatal, returns original URL)

### Video Generation Timeout Fix (March 2025)
- kie.ai video tasks can queue for 30+ minutes before processing starts
- Increased absolute wall-clock timeout for video tasks from 30 min to 75 min (45 min queue + 30 min running)
- Image tasks keep the default 30 min absolute timeout (they complete in ~1-2 minutes)
- Timeout errors are now treated as retryable — the system resubmits a fresh task (up to 5 attempts) instead of failing immediately
- Both `generateVideoWithMotionKie` (Video Recreate) and `generateVideoWithKling26Kie` (prompt-to-video) use the extended timeout

### Credit Floor Protection
A `charge.refunded` webhook handler ensures credit balances do not become negative after refunds.

### Invoice Renewal Idempotency
The `invoice.payment_succeeded` webhook now creates a `CreditTransaction` with `paymentSessionId: invoice.id` inside a transaction, with P2002 duplicate detection, preventing double credit awards on Stripe retries.

### Route Protection
- `/admin` uses `AdminRoute` (role check for `admin`)
- `/nsfw` uses `ProtectedRouteWithOnboarding` (enforces onboarding completion)
- Model deletion blocks if active generations are in progress (409 response)

### File Upload Security
- Main `/api/upload` and `/api/draft/upload` enforce file type validation (images and videos only via multer `fileFilter`)
- `mirrorToR2` enforces a 100MB size limit on external file fetches to prevent memory exhaustion

### R2 Storage Cleanup
- Model deletion removes reference photos from R2 (best-effort)
- LoRA deletion removes training images and LoRA weights from R2 (best-effort)
- Generation auto-cleanup removes R2 output files when deleting oldest generations over the 200-per-model limit

### Admin Audit Logging
All destructive admin actions (`add_credits`, `update_user_settings`, `delete_user`) are logged to the `AdminAuditLog` table with `adminUserId`, `action`, `targetType`, `targetId`, and `detailsJson`.

### Model Limits
Model creation uses `getModelLimit(subscriptionTier)` as the default when `user.maxModels` is not explicitly set (Starter: 1, Pro: 2, Business: 4).

## External Dependencies

### Third-Party APIs
- **RunPod Serverless (Custom Docker)**: For img2img pipeline (JoyCaption + img2img swap).
- **WaveSpeed API**: For NSFW video generation and face-swap video.
- **kie.ai API**: For SFW image generation (Seedream 4.5 Edit, Nano Banana Pro), SFW video generation (Kling 2.6 Motion Control), and prompt-to-video (Kling 2.6 Image-to-Video).
- **OpenAI API**: GPT-4o-mini for prompt enhancement.
- **Stripe**: Payment gateway.
- **Cloudflare R2**: Primary file storage.
- **Cloudinary**: Legacy and fallback media storage.
- **FingerprintJS**: Device fingerprinting for abuse prevention.
- **APIFY_API_TOKEN**: For Instagram scraping via Apify (used by Viral Reel Finder).

### Database Service
- **Neon Serverless PostgreSQL**: Managed database service.

### Email Service
- **SendGrid**: For email verification, purchase confirmations, and notifications. All emails use a unified `renderBaseEmailShell` template with dynamic branding and dynamic copyright year. Fallback sender is `noreply@modelclone.app`.

### System Dependencies
- **FFmpeg**: For video processing in the Repurposer feature. Must be installed on the server (e.g. `apt install ffmpeg`). The app uses `@ffmpeg-installer/ffmpeg` as a fallback when `FFMPEG_PATH`/`FFPROBE_PATH` are not set. For multiple copies (e.g. 5), encoding runs sequentially on the server—ensure the server has enough CPU and that the process is not killed by a short serverless timeout.
- **exiftool**: For metadata spoofing in the Repurposer feature.