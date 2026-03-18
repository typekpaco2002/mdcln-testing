# ModelClone - AI Face Cloning SaaS Platform

> Production-ready SaaS platform for social media content creators using AI face-swapping technology

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Neon recommended)
- API keys (see [Required API Keys](#required-api-keys))

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env and fill in your API keys
```

3. **Set up database**
```bash
npx prisma generate
npx prisma db push
```

4. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:5000`

---

## 📋 Required API Keys

### ⚠️ IMPORTANT: API Keys NOT Included
For security, API keys are **NOT** included in this repository. You must obtain them yourself.

| Service | Purpose | Get It From | Required? |
|---------|---------|-------------|-----------|
| **WaveSpeed** | AI face-swapping | https://wavespeed.ai | ✅ Yes |
| **Cloudinary** | Media storage | https://cloudinary.com | ✅ Yes |
| **Stripe** | Payments | https://stripe.com | ✅ Yes (Production) |
| **PostgreSQL** | Database | https://neon.tech | ✅ Yes |
| **OpenAI** | Prompt enhancement | https://platform.openai.com | ⚠️ Only if NOT on Replit |
| **Email Service** | Verification emails | Gmail or Resend | ❌ Optional |

**Full setup guide**: See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md#required-api-keys--secrets)

---

## 💰 Pricing Structure

| Feature | Cost | Notes |
|---------|------|-------|
| **Image Generation** | 3 credits | Per image |
| **Motion Transfer Video** | 20 credits | Flat rate, any length |
| **Face Swap Video** | 1 credit/second | Depends on video duration |
| **Frame Recreation** | 3 credits/attempt | Can redo multiple times |
| **2-Step Video** | 23+ credits | Minimum (increases with redos) |

**Free Tier**: 25 credits upon email verification

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL + Prisma ORM
- **AI**: WaveSpeed API (Seedream V4 Edit + WAN 2.2 Animate)
- **Storage**: Cloudinary
- **Payments**: Stripe
- **Auth**: JWT + bcryptjs

### Key Features
- ✅ 2-step video generation for professional quality
- ✅ Request queue for API rate limit management
- ✅ Atomic credit system with audit log
- ✅ Anti-abuse with FingerprintJS
- ✅ Server-side generation polling
- ✅ Vertical video format (9:16) for TikTok/Reels
- ✅ AI-powered prompt enhancement

---

## 📚 Documentation

- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** - Complete setup and architecture guide
- **[replit.md](replit.md)** - Technical architecture and design decisions
- **[.env.example](.env.example)** - Environment variables template

---

## 🚀 Deployment

### Option 1: Replit (Recommended)
1. Import project to Replit
2. Add secrets via Secrets panel
3. Click "Run" - automatic deployment
4. Production database created automatically

### Option 2: Other Platforms (Vercel, Railway, etc.)
1. Set all environment variables
2. Run build: `npm run build`
3. Start: `npm start`
4. Configure Stripe webhook URL
5. Run migrations: `npx prisma migrate deploy`

**Full deployment guide**: See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md#deployment-guide)

---

## 🐛 Troubleshooting

### Common Issues

**"Resolution must be 480p or 720p"**
- WaveSpeed only supports these resolutions
- Code defaults to 720p

**Video generation fails**
- Check `outputUrl` vs `video` property naming
- Ensure server cache cleared after code changes

**Stripe webhook fails**
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Use Stripe CLI: `stripe listen --forward-to localhost:5000/api/webhooks/stripe`

**More solutions**: See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md#troubleshooting)

---

## 📁 Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable UI
│   │   ├── lib/        # Utilities, API
│   │   └── hooks/      # Custom hooks
├── server/              # Express backend
│   ├── src/
│   │   ├── controllers/ # Route handlers
│   │   ├── services/    # Business logic
│   │   ├── middleware/  # Auth, validation
│   │   └── routes/      # API routes
├── prisma/              # Database schema
├── DEVELOPER_GUIDE.md   # Setup guide
├── .env.example         # Env template
└── package.json
```

---

## 🎯 Why This Architecture?

### 2-Step Video Generation
WaveSpeed's automatic frame extraction often picks poor-quality frames. Our solution:
1. Extract frames at 1fps → User selects best → Recreate (3 credits/attempt)
2. Use recreated image → Generate video (20 credits)

**Result**: Professional videos, worth the extra credits.

### Request Queue
WaveSpeed Silver tier: 20 concurrent requests max. Queue prevents rate limits during traffic spikes.

### Atomic Credits
Credits deducted BEFORE generation starts → prevents abuse and race conditions.

---

## 📄 License

Proprietary - All rights reserved

---

## 🤝 Support

For questions about:
- **Architecture decisions**: See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)
- **Technical details**: See [replit.md](replit.md)
- **Setup issues**: See [Troubleshooting](DEVELOPER_GUIDE.md#troubleshooting)

---

**Version**: 1.0.0  
**Last Updated**: November 2025
