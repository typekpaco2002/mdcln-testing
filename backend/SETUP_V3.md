# 🚀 MODELCLONE BACKEND V3.0 - Setup Guide

## ✅ ČO JE NOVÉ:

### **1. Email Verification** ✉️
- Resend integration
- 6-digit verification codes
- 10-minute expiration
- Resend code functionality
- Block unverified logins

### **2. Credit System** 💰
- Unified credits (1 credit = $0.10)
- Image: 3 credits ($0.30)
- Video: 4 credits per second ($0.40/s)
- HD 720p only
- Per-second pricing

### **3. Subscription Tiers** 📊
- Starter: $29 → 319 credits (10% bonus)
- Pro: $79 → 948 credits (20% bonus)
- Business: $199 → 2587 credits (30% bonus)
- Enterprise: $499 → 7485 credits (50% bonus)

### **4. Margins** 📈
- Image: 77% margin
- Video: 73-79% margin
- ALL tiers: 64-82% margins
- GUARANTEED >50% margins

---

## 📋 PREREQUISITES:

### **1. Resend Account**
```
1. Go to https://resend.com
2. Sign up (free tier: 100 emails/day)
3. Add domain OR use testing mode
4. Get API key from dashboard
5. Add to .env: RESEND_API_KEY=re_xxx
```

### **2. Database**
```
PostgreSQL database required
- Render.com (free tier)
- Supabase (free tier)
- Neon.tech (free tier)
```

### **3. WaveSpeed API**
```
Already have this ✅
```

---

## 🔧 INSTALLATION:

### **Step 1: Install Dependencies**
```bash
npm install
```

New packages:
- `resend@^3.2.0` - Email service

### **Step 2: Setup Environment**
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database
DATABASE_URL="your-postgres-url"

# JWT
JWT_SECRET="your-super-secret-key"

# WaveSpeed
WAVESPEED_API_KEY="your-wavespeed-key"

# Resend (NEW!)
RESEND_API_KEY="re_your_key_here"

# CORS
FRONTEND_URL="http://localhost:5173"
```

### **Step 3: Database Migration**
```bash
npx prisma generate
npx prisma db push
```

This creates:
- Updated User model (verification fields + credits)
- Updated Generation model (duration, resolution, credits)
- New SavedModel model

---

## 📧 EMAIL CONFIGURATION:

### **Option A: Testing Mode** (fastest)
```
1. Use Resend API key as-is
2. Emails sent to your Resend registered email
3. Perfect for testing!
```

### **Option B: Production (custom domain)**
```
1. Add domain to Resend
2. Add DNS records
3. Verify domain
4. Update from: 'noreply@yourdomain.com'
```

---

## 🎯 API ENDPOINTS:

### **NEW Auth Endpoints:**

#### **1. Signup**
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

Response:
{
  "success": true,
  "message": "Account created! Please check your email for verification code.",
  "userId": "uuid",
  "email": "user@example.com",
  "requiresVerification": true
}
```

#### **2. Verify Email**
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}

Response:
{
  "success": true,
  "message": "Email verified successfully!",
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "credits": 319,
    "isVerified": true
  }
}
```

#### **3. Resend Code**
```http
POST /api/auth/resend-code
Content-Type: application/json

{
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "message": "Verification code sent!"
}
```

#### **4. Login** (updated)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response (verified):
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "credits": 319,
    "isVerified": true
  }
}

Response (not verified):
{
  "success": false,
  "message": "Please verify your email first",
  "requiresVerification": true,
  "email": "user@example.com"
}
```

---

## 💰 PRICING SYSTEM:

### **Credit Calculations:**

```javascript
// Image
const imageCredits = 3; // Fixed
const imageCost = 3 * 0.10 = $0.30

// Video
const videoCredits = duration * 4; // 4 credits per second
const videoCost = videoCredits * 0.10

// Examples:
5s video = 20 credits = $2.00
10s video = 40 credits = $4.00
15s video = 60 credits = $6.00
```

### **Check Credits Endpoint:**
```http
GET /api/auth/profile
Authorization: Bearer <token>

Response:
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "credits": 319,
    "totalCreditsUsed": 0,
    "subscriptionTier": null,
    "isVerified": true
  }
}
```

---

## 🚀 RUNNING:

### **Development:**
```bash
npm run dev
```

### **Production:**
```bash
npm start
```

Server runs on: `http://localhost:3000`

---

## 🧪 TESTING EMAIL:

### **Test Verification Flow:**

```bash
# 1. Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User"
  }'

# 2. Check email for code

# 3. Verify
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'

# 4. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

---

## 📊 DATABASE SCHEMA:

### **User Model:**
```prisma
model User {
  id                   String
  email                String    @unique
  password             String
  name                 String?
  
  // Verification
  isVerified           Boolean   @default(false)
  verificationCode     String?
  codeExpiresAt        DateTime?
  
  // Credits
  credits              Int       @default(319)
  totalCreditsUsed     Int       @default(0)
  
  // Relations
  generations          Generation[]
  savedModels          SavedModel[]
}
```

### **Generation Model:**
```prisma
model Generation {
  id                String
  userId            String
  type              String    // 'image' or 'video'
  
  // Video specific
  duration          Int?      // seconds
  resolution        String?   // '720p'
  
  // Pricing
  creditsCost       Int       // credits charged
  actualCostUSD     Float?    // our cost
  
  status            String
  outputUrl         String?
  createdAt         DateTime
}
```

---

## 🔒 SECURITY:

- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens (30-day expiry)
- ✅ Email verification required
- ✅ Rate limiting on verification codes
- ✅ Codes expire after 10 minutes
- ✅ CORS protection

---

## 🐛 TROUBLESHOOTING:

### **Email not sending:**
```
1. Check RESEND_API_KEY in .env
2. Check Resend dashboard for errors
3. Check server logs for error messages
4. Verify domain (if using custom domain)
```

### **Database errors:**
```bash
# Reset database
npx prisma migrate reset

# Regenerate client
npx prisma generate

# Push schema
npx prisma db push
```

### **Credits not working:**
```
1. Check database migration completed
2. Check User.credits field exists
3. Default is 319 credits for new users
```

---

## 📈 MONITORING:

### **Check Health:**
```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "success": true,
  "message": "Model Clone API is running",
  "version": "3.0.0 - Email Verification + Credit System",
  "workflow": "WaveSpeed + HD 720p + Credits"
}
```

---

## 🎉 READY!

Backend is now ready with:
- ✅ Email verification
- ✅ Credit system
- ✅ HD 720p video
- ✅ Per-second pricing
- ✅ Subscription tiers
- ✅ Margin protection

**Deploy to Render.com and test!** 🚀
