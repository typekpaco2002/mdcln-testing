# ModelClone - Developer Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Design Decisions](#architecture--design-decisions)
3. [Required API Keys & Secrets](#required-api-keys--secrets)
4. [Environment Setup](#environment-setup)
5. [Database Setup](#database-setup)
6. [Key Features & Implementation](#key-features--implementation)
7. [Deployment Guide](#deployment-guide)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

**ModelClone** is a production-ready SaaS platform for social media content creators to generate AI-powered face-swapped videos and images for TikTok/Instagram Reels.

### Business Model
- **Credit-based system**: Users pay per generation
  - **Images**: 3 credits per image
  - **Videos (2-step method)**: 20 credits + 3 credits per frame recreation attempt
  - **Face swap videos**: 1 credit per second of video duration
- **Stripe integration**: Subscription plans + one-time credit purchases
- **Free tier**: 25 credits upon email verification
- **Anti-abuse**: FingerprintJS device tracking + email verification

### Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **AI**: WaveSpeed API (Seedream V4 Edit for images, WAN 2.2 Animate for videos)
- **Storage**: Cloudinary (images & videos)
- **Payments**: Stripe
- **Email**: Nodemailer (optional)

---

## 🏗️ Architecture & Design Decisions

### Why 2-Step Video Generation?
**Problem**: WaveSpeed's WAN 2.2 Animate model automatically extracts frames from uploaded videos, but often picks poor-quality frames (motion blur, bad angles), resulting in low-quality AI videos.

**Solution**: Our 2-step approach gives users control:
1. **Step 1**: Extract frames at 1fps → User selects best frame → Recreate with Seedream V4 Edit (3 credits per attempt)
   - **Note**: Users can "Redo" if unsatisfied, costing an additional 3 credits per redo (6, 9, 12, etc.)
2. **Step 2**: Use recreated image + reference video → WAN 2.2 generates final video (20 credits flat)

**Total Cost**: Minimum 23 credits (one recreation + video), but can be higher if user redoes frame recreation.

**Result**: Professional-quality videos every time, worth the extra credits for guaranteed quality.

### Concurrency Management (Request Queue)
WaveSpeed Silver tier allows **20 concurrent API calls**. We implemented a queue system (`queue.service.js`) to:
- Prevent 429 rate limit errors
- Handle burst traffic gracefully
- Configurable via `WAVESPEED_MAX_CONCURRENT` env var
- 10-minute timeout protection

### Credit System Architecture
- **Atomic transactions**: Credits deducted BEFORE generation starts (prevents abuse)
- **Dual-pool system**: Subscription credits used first, then purchased credits
- **Audit log**: Every credit movement tracked in `CreditTransactions` table
- **Duplicate prevention**: `paymentSessionId` unique constraint prevents double-awards

### Generation Tracking System
**Server-side poller** (`generation-poller.service.js`):
- Polls WaveSpeed API every 5 seconds
- Updates database automatically when generation completes
- Eliminates race conditions

**Frontend tracker** (`useGenerationTracker` hook):
- Polls `/api/generations` endpoint every 5 seconds
- Displays current database state (single source of truth)
- No localStorage complexity

### Video Format
All videos are **9:16 vertical (720p)** for TikTok/Instagram Reels. This is hardcoded in the generation logic.

### Prompt Enhancement System
Uses **OpenAI GPT-4o-mini** (via Replit AI integration) to transform simple keywords into detailed scene descriptions:
- **Content-rating aware**: "Sexy" mode adds revealing clothing prompts, "PG-13" mode keeps it modest
- **Photo style system**: "Professional" (editorial photoshoot) vs "Amateur" (spontaneous snapshot)
- **No negative prompts**: Seedream V4 Edit doesn't support them - we use positive prompt engineering only

---

## 🔑 Required API Keys & Secrets

### ⚠️ IMPORTANT: Secrets Are NOT Included in Zip
For security, **API keys are stored in environment variables** and are **NOT** included in this download. You must obtain and configure them yourself.

### Required Secrets

#### 1. **WaveSpeed API** (AI Generation)
- **Key**: `WAVESPEED_API_KEY`
- **How to get**: Sign up at https://wavespeed.ai
- **Tier**: Silver tier ($99/month) - 20 concurrent requests
- **Usage**: Image generation (Seedream V4 Edit) + Video animation (WAN 2.2)

#### 2. **Cloudinary** (Media Storage)
- **Keys**: 
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- **How to get**: Sign up at https://cloudinary.com (free tier available)
- **Usage**: Store uploaded photos, generated images/videos

#### 3. **Stripe** (Payments)
- **Keys**:
  - `STRIPE_SECRET_KEY` (production)
  - `VITE_STRIPE_PUBLIC_KEY` (frontend)
  - `STRIPE_WEBHOOK_SECRET` (webhook verification)
  - `TESTING_STRIPE_SECRET_KEY` (test mode)
  - `TESTING_VITE_STRIPE_PUBLIC_KEY` (test mode frontend)
- **How to get**: Sign up at https://stripe.com
- **Usage**: Subscriptions + one-time credit purchases

#### 4. **Database** (PostgreSQL)
- **Key**: `DATABASE_URL`
- **Format**: `postgresql://user:password@host:5432/database?sslmode=require`
- **How to get**: Use Neon (https://neon.tech) or any PostgreSQL provider
- **Usage**: User data, credits, generations, models

#### 5. **JWT & Session Secrets**
- **Keys**:
  - `JWT_SECRET` (for authentication tokens)
  - `SESSION_SECRET` (for Express sessions)
- **How to generate**: Use any strong random string (e.g., `openssl rand -base64 32`)

#### 6. **OpenAI** (Optional - Prompt Enhancement)
- **Note**: This project uses **Replit AI Integration** which handles API keys automatically
- **If deploying elsewhere**: You'll need `OPENAI_API_KEY` from https://platform.openai.com
- **Usage**: GPT-4o-mini for prompt enhancement

### Optional Secrets
- `GMAIL_USER` + `GMAIL_APP_PASSWORD`: For email verification (using Nodemailer)
- `RESEND_API_KEY`: Alternative email service

---

## 🚀 Environment Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create `.env` File
Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# WaveSpeed AI
WAVESPEED_API_KEY="your_wavespeed_api_key"
WAVESPEED_MAX_CONCURRENT=20

# Cloudinary
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Stripe (Production)
STRIPE_SECRET_KEY="sk_live_..."
VITE_STRIPE_PUBLIC_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Stripe (Testing)
TESTING_STRIPE_SECRET_KEY="sk_test_..."
TESTING_VITE_STRIPE_PUBLIC_KEY="pk_test_..."

# Authentication
JWT_SECRET="your_random_jwt_secret_at_least_32_chars"
SESSION_SECRET="your_random_session_secret"

# Email (Optional)
GMAIL_USER="your_email@gmail.com"
GMAIL_APP_PASSWORD="your_app_password"
# OR
RESEND_API_KEY="re_..."

# Port (optional)
PORT=5000
```

### 3. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# OR run migrations (production)
npx prisma migrate deploy
```

### 4. Start Development Server
```bash
npm run dev
```

This starts:
- **Backend**: Express server on port 5000
- **Frontend**: Vite dev server (proxied through Express)

---

## 💾 Database Setup

### Schema Overview
The database uses **Prisma ORM** with PostgreSQL:

#### Tables:
1. **User**: Authentication, credits, subscription status
2. **Model**: Face models (3 photos per model)
3. **Generation**: Image/video generation history
4. **CreditTransaction**: Audit log for all credit movements

### Migration Strategy

#### Development:
```bash
npx prisma db push
```
Syncs schema changes directly to database (no migration files).

#### Production:
```bash
# Create migration
npx prisma migrate dev --name description_of_change

# Deploy to production
npx prisma migrate deploy
```

**Note**: The app automatically runs `prisma migrate deploy` on startup (see `server/index.ts`).

### Initial Migration
The project includes `prisma/migrations/0_init` which captures the baseline schema. This migration is **already applied** to the development database.

---

## 🎨 Key Features & Implementation

### 1. Face Model Creation
**Flow**: Upload 3 photos → Cloudinary upload → Store URLs in database

**Why 3 photos**: WaveSpeed requires multiple angles for accurate identity preservation.

**Code**: `src/controllers/model.controller.js` → `createModel()`

### 2. Image Generation (Seedream V4 Edit)
**Flow**: 
1. Select model → Enter prompt → AI enhancement (OpenAI) → Select style → Generate
2. Deduct 3 credits → Call WaveSpeed API → Poll for completion → Save to DB

**API**: `POST /api/generate/image-identity`

**Service**: `src/services/wavespeed.service.js` → `generateImageWithIdentity()`

### 3. Video Generation (2-Step Method)
**Step 1**: Extract & Recreate Frame
- Upload video → Extract frames at 1fps (FFmpeg) → User selects best → Recreate with Seedream V4
- **Cost**: 3 credits per recreation attempt (users can redo multiple times)
- **API**: `POST /api/generate/extract-frames` + `POST /api/generate/image-identity`

**Step 2**: Motion Transfer
- Use recreated image + reference video → WAN 2.2 Animate generates final video
- **Cost**: 20 credits (flat rate, regardless of video length)
- **API**: `POST /api/generate/video-motion`

**Total Cost**: 23+ credits (minimum, increases by 3 for each redo)

**Why this works**: Guarantees high-quality starting frame, avoiding WAN 2.2's automatic extraction issues.

### 4. Face Swap Video Generation
**Alternative approach**: Direct face swap on existing videos
- Upload video → System swaps face directly
- **Cost**: 1 credit per second of video duration
- **API**: `POST /api/generate/face-swap`
- **Use case**: For users who have pre-existing videos and want quick face swaps

### 5. Credit System
**Deduction Logic** (`src/services/user.service.js`):
```javascript
1. Try to use subscription credits first
2. If insufficient, use purchased credits
3. If still insufficient, throw error
4. Log transaction in CreditTransactions table
```

**Pricing Structure**:
- **Image generation**: 3 credits per image
- **Motion transfer video**: 20 credits (flat, regardless of duration)
- **Face swap video**: 1 credit per second of video
- **Frame recreation**: 3 credits per attempt (can redo multiple times)

**Top-up**: Stripe webhook (`/api/webhooks/stripe`) awards credits on successful payment.

### 6. Stripe Integration
**Products**:
- **Starter Plan**: $9.99/mo, 100 credits/mo
- **Creator Plan**: $24.99/mo, 300 credits/mo
- **Pro Plan**: $49.99/mo, 750 credits/mo
- **One-time packages**: 50, 100, 200 credits

**Webhook**: Handles `checkout.session.completed` to award credits.

**Setup**: Use Stripe CLI to forward webhooks in development:
```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

### 7. Anti-Abuse System
**FingerprintJS** tracks device fingerprints to prevent:
- Multiple signups for free credits
- Abusing free tier

**Implementation**: `client/src/lib/fingerprint.js`

---

## 🚀 Deployment Guide

### Deploying to Replit
1. Import this project to Replit
2. Add secrets via Replit Secrets panel (same names as `.env` above)
3. Click "Run" - automatic deployment via Reserved VM
4. Production database created automatically

### Deploying Elsewhere (Vercel, Railway, etc.)

#### 1. Set Environment Variables
Add all secrets from the `.env` section above to your hosting provider's dashboard.

#### 2. Build Command
```bash
npm run build
```

#### 3. Start Command
```bash
npm start
```

#### 4. Configure Stripe Webhook
Set webhook URL to: `https://your-domain.com/api/webhooks/stripe`

#### 5. Database Migrations
Ensure `DATABASE_URL` points to production database, then:
```bash
npx prisma migrate deploy
```

---

## 🐛 Troubleshooting

### Issue: "Resolution must be 480p or 720p"
**Cause**: WaveSpeed only supports these two resolutions.
**Fix**: Code is already set to `720p` (see `src/services/wavespeed.service.js`)

### Issue: Video generation fails with status "processing"
**Cause**: Database not saving `outputUrl` due to property name mismatch.
**Fix**: Ensure controller uses `result.outputUrl` not `result.video`

### Issue: Node.js cache not clearing
**Solution**: Force kill and restart:
```bash
pkill -9 -f "tsx server/index.ts"
npm run dev
```

### Issue: Stripe webhook verification fails
**Cause**: Wrong `STRIPE_WEBHOOK_SECRET`
**Fix**: 
1. Run `stripe listen --forward-to localhost:5000/api/webhooks/stripe`
2. Copy the webhook signing secret
3. Update `STRIPE_WEBHOOK_SECRET` in `.env`

### Issue: Database connection error
**Check**:
1. `DATABASE_URL` format is correct
2. Database is accessible (firewall/network)
3. SSL mode is enabled for Neon

### Issue: Cloudinary upload fails
**Check**:
1. All three env vars are set correctly
2. Cloud name matches your Cloudinary dashboard
3. API key/secret are not expired

---

## 📚 Additional Resources

### File Structure
```
├── client/                  # React frontend
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable UI components
│   │   ├── lib/            # Utilities, API client
│   │   └── hooks/          # Custom React hooks
├── server/                  # Express backend
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, validation
│   │   └── routes/         # API routes
├── prisma/                  # Database schema & migrations
├── attached_assets/         # Static assets
└── .env                     # Environment variables (NOT in zip!)
```

### API Endpoints Summary
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/models/create` - Create face model
- `POST /api/generate/image-identity` - Generate image
- `POST /api/generate/extract-frames` - Extract video frames
- `POST /api/generate/video-motion` - Generate video with motion
- `POST /api/checkout/create-session` - Stripe checkout
- `POST /api/webhooks/stripe` - Stripe webhook handler

### Important Constants
- **Image generation cost**: 3 credits per image
- **Motion transfer video cost**: 20 credits (flat rate)
- **Face swap video cost**: 1 credit per second of video
- **Frame recreation cost**: 3 credits per attempt (can redo multiple times)
- **2-step video total cost**: Minimum 23 credits (one recreation + video), increases by 3 per redo
- **Free credits**: 25 (awarded on email verification)
- **Video format**: 9:16 vertical, 720p
- **Max concurrent WaveSpeed calls**: 20 (Silver tier)
- **Queue timeout**: 10 minutes

---

## ❓ Questions or Issues?

This project was built with specific architectural decisions to solve real-world problems:
1. **2-step video generation** solves quality issues with automatic frame extraction
2. **Request queue** prevents API rate limits during traffic spikes
3. **Atomic credit deduction** prevents race conditions and abuse
4. **Server-side polling** eliminates frontend complexity and race conditions

If you have questions about any design decision, refer to `replit.md` for detailed rationale.

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**License**: Proprietary  
