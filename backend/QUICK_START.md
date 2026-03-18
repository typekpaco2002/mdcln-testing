# 🚀 MODELCLONE BACKEND - QUICK START

## ✅ ČO JE HOTOVÉ:

- ✅ WaveSpeed API integrácia (Seedream V4 Edit + WAN 2.2 Animate)
- ✅ Email verification (Resend API **NAKONFIGUROVANÝ**)
- ✅ Credit systém (1 credit = $0.10)
- ✅ JWT authentication
- ✅ PostgreSQL database schema
- ✅ Bronze tier limits (3 concurrent requests)
- ✅ Queue system pre handling requestov

---

## 📋 ČO POTREBUJEŠ:

### 1. **WaveSpeed API Key** 
```
1. Choď na https://wavespeed.ai
2. Sign up (cez Gmail alebo GitHub)
3. Dashboard → API Keys
4. Copy API key
```

### 2. **PostgreSQL Database** (FREE)
```
Option A - Render.com (odporúčam):
1. https://render.com → Sign up
2. New → PostgreSQL
3. Free tier
4. Copy "External Database URL"

Option B - Supabase:
1. https://supabase.com → Sign up
2. New Project
3. Copy connection string
```

### 3. **Resend Email** ✅ **UŽ MÁTE NAKONFIGUROVANÉ!**
```
API Key: re_Mpav1UjP_7L5DiUhTC7NgECGRc3c4a9k9
✅ Ready to use!
```

---

## 🔧 SETUP (5 MINÚT):

### Krok 1: Nainštaluj závislosti
```bash
npm install
```

### Krok 2: Nastav .env
```bash
# .env súbor je už vytvorený, len vyplň:

# 1. WaveSpeed API Key (z kroku 1)
WAVESPEED_API_KEY=tvoj_wavespeed_key_tu

# 2. Database URL (z kroku 2)
DATABASE_URL=tvoj_database_url_tu

# 3. JWT Secret (vygeneruj random)
JWT_SECRET=$(openssl rand -base64 32)

# Resend je už nastavený! ✅
```

### Krok 3: Setup databázy
```bash
npx prisma generate
npx prisma db push
```

### Krok 4: Spusti server
```bash
npm run dev
```

Mělo by ti vyskočiť:
```
🚀 MODEL CLONE API
📡 Server: http://localhost:3000
✅ Database: Connected
✅ WaveSpeed: Configured
✅ Resend Email: Ready (Bronze tier limits)
```

---

## 🧪 TESTOVANIE:

### Test 1: Health Check
```bash
curl http://localhost:3000/api/health
```

Očakávaná odpoveď:
```json
{
  "success": true,
  "message": "Model Clone API is running",
  "version": "3.0 - Email + Credits + Queue"
}
```

### Test 2: Signup + Email Verification
```bash
# 1. Vytvor účet
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tvoj@email.com",
    "password": "Test123!",
    "name": "Test User"
  }'
```

Dostaneš email s 6-digit kódom! 📧

```bash
# 2. Verify email
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tvoj@email.com",
    "code": "123456"
  }'
```

Dostaneš JWT token! 🎉

### Test 3: Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tvoj@email.com",
    "password": "Test123!"
  }'
```

### Test 4: Generate Video (full pipeline)
```bash
curl -X POST http://localhost:3000/api/generate/complete-recreation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TVOJ_TOKEN_TU" \
  -d '{
    "modelIdentityImages": [
      "https://example.com/model1.jpg",
      "https://example.com/model2.jpg",
      "https://example.com/model3.jpg"
    ],
    "videoScreenshot": "https://example.com/screenshot.jpg",
    "originalVideoUrl": "https://example.com/video.mp4"
  }'
```

---

## 📊 RATE LIMITS (BRONZE TIER):

```
✅ 3 concurrent requests NARAZ
✅ Queue system pre čakajúcich
✅ 10 images / 5 videos per minute

Keď User 4 príde:
→ Automaticky sa pridá do queue
→ Čaká kým sa uvoľní slot
→ Potom sa spracuje
```

---

## 🚀 DEPLOY NA RENDER:

### Krok 1: Push na GitHub
```bash
git init
git add .
git commit -m "ModelClone backend ready"
git branch -M main
git remote add origin https://github.com/TVOJ_USERNAME/modelclone-backend.git
git push -u origin main
```

### Krok 2: Deploy
```
1. Choď na https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Build Command: npm install && npx prisma generate
5. Start Command: npm start
6. Add environment variables:
   - WAVESPEED_API_KEY
   - DATABASE_URL (from PostgreSQL)
   - JWT_SECRET
   - RESEND_API_KEY (už máš)
   - NODE_ENV=production
7. Create Service
```

### Krok 3: Database Migration
```bash
# Po deploye:
1. Render Dashboard → Shell
2. Spusti: npx prisma db push
```

---

## 💰 NÁKLADY:

### Development (Free):
- ✅ Render: Free tier
- ✅ PostgreSQL: Free tier
- ✅ Resend: 100 emails/day free
- ✅ WaveSpeed: Bronze tier (free s limitmi)

### Production (~$10-20/mesiac):
- Render: $7/mo (pre production)
- PostgreSQL: Free alebo $7/mo
- WaveSpeed: Pay-as-you-go
- Resend: $20/mo pre viac emailov

---

## 📈 UPGRADE PATH:

Keď máš 10+ platiacich zákazníkov:

### WaveSpeed Silver Tier:
```
100 concurrent requests (vs 3)
500 images/min (vs 10)
60 videos/min (vs 5)

= Zvládne 1000+ userov/deň! 🔥
```

---

## ✅ ĎALŠIE KROKY:

1. ✅ **Backend setup** (práve robíš)
2. 🔨 **Frontend vytvorenie** (React app)
3. 💳 **Stripe integrácia** (payments)
4. 📤 **File upload** (Cloudinary/S3)
5. 🚀 **Launch!**

---

## 🆘 TROUBLESHOOTING:

### "Resend error: Domain not verified"
```
→ Normal! V testing mode funguje len pre email 
   ktorý si použil pri registrácii Resend účtu
→ Pre production musíš pridať vlastnú doménu
```

### "WaveSpeed: Too many requests"
```
→ Dosiahol si Bronze limit (3 concurrent)
→ Queue system automaticky spracuje request keď sa uvoľní slot
→ Alebo upgrade na Silver tier
```

### "Database connection failed"
```
→ Skontroluj DATABASE_URL v .env
→ Musí byť valid PostgreSQL connection string
```

---

## 🎉 HOTOVO!

Backend je **PRODUCTION READY** s:
- ✅ Email verification
- ✅ Credit system  
- ✅ Queue system pre Bronze tier
- ✅ WaveSpeed API
- ✅ Secure authentication

**Teraz môžeme pustiť FRONTEND!** 🚀
