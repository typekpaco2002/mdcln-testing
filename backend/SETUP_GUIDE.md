# 🚀 MODEL CLONE - COMPLETE SETUP GUIDE

## ✅ WHAT'S FIXED:

**Line 71 in wavespeed.service.js:**
- Changed `image:` to `images:` ✅
- Added `enable_base64_output: false` ✅

**This fixes the error:**
```
❌ ERROR 400: property "images" is missing
```

---

## 📦 WHAT'S INCLUDED:

```
modelclone-fixed/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   └── generation.controller.js
│   ├── middleware/
│   │   └── auth.middleware.js
│   ├── routes/
│   │   └── api.routes.js
│   ├── services/
│   │   ├── wavespeed.service.js  ← FIXED!
│   │   └── replicate.service.js
│   └── server.js
├── prisma/
│   └── schema.prisma
├── package.json
├── README.md
├── .env.example
└── .gitignore
```

---

## 🚀 DEPLOYMENT STEPS:

### 1️⃣ Extract and Setup

```bash
# Extract the zip
cd ~/Downloads
unzip modelclone-fixed.zip

# Go into the folder
cd modelclone-fixed

# Create .env file
cp .env.example .env

# Edit .env and add your WAVESPEED_API_KEY
nano .env
# or use any text editor
```

**Important:** Add your WaveSpeed API key to `.env`:
```
WAVESPEED_API_KEY=3d24aabb0f2ee401c76ff5ba6ca89abe508f2881f4ce54dd821c0b80cb8a52d2
```

---

### 2️⃣ Push to GitHub

```bash
# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Model Clone - WaveSpeed API fixed"

# Add your GitHub repo
git remote add origin https://github.com/YOUR_USERNAME/modelclone.git

# Push
git push -f origin main
```

---

### 3️⃣ Deploy on Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Settings:
   - **Name:** modelclone
   - **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command:** `npm start`
5. **Environment Variables:** (click "Add Environment Variable")
   ```
   WAVESPEED_API_KEY = 3d24aabb0f2ee401c76ff5ba6ca89abe508f2881f4ce54dd821c0b80cb8a52d2
   JWT_SECRET = your-random-secret-here
   NODE_ENV = production
   FRONTEND_URL = https://your-frontend-url.com
   ```
6. **Database:**
   - Click "New +" → "PostgreSQL"
   - Name it "modelclone-db"
   - Copy the "Internal Database URL"
   - Add as environment variable:
     ```
     DATABASE_URL = [paste the database URL]
     ```
7. Click "Create Web Service"
8. Wait 3-5 minutes for deployment

---

### 4️⃣ Test It!

Once deployed, visit:
```
https://your-app-name.onrender.com/api/health
```

You should see:
```json
{
  "success": true,
  "message": "Model Clone API is running",
  "version": "2.0.0"
}
```

---

## 🧪 TEST IMAGE GENERATION:

### 1. Create Account:
```bash
curl -X POST https://your-app.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User"
  }'
```

Save the `token` from the response!

### 2. Generate Image:
```bash
curl -X POST https://your-app.onrender.com/api/generate/image-identity \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "identityImages": [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg",
      "https://example.com/photo3.jpg"
    ],
    "targetImage": "https://example.com/target.jpg",
    "size": "2K"
  }'
```

**Should work now!** ✅

---

## 📊 CHECK RENDER LOGS:

Go to Render Dashboard → Your Service → Logs

You should see:
```
🎨 IMAGE IDENTITY RECREATION (Seedream V4 Edit)
📸 Identity photos: 3
🎯 Target image: https://...
📝 Using prompt: recreate image 4...
⏳ Submitting to WaveSpeed...
✅ Task submitted! Request ID: abc123  ← SUCCESS!
⏳ Waiting for result...
✅ Generation complete!
🖼️  Output URL: https://...
```

---

## 🎯 WHAT'S NEXT:

1. ✅ Backend deployed and working
2. 🔨 Build your frontend (React/Next.js)
3. 🖼️ Add file upload (Cloudinary/S3)
4. 💳 Add Stripe payments
5. 🚀 Launch!

---

## 🆘 TROUBLESHOOTING:

### "Module not found"
```bash
npm install
```

### "Prisma error"
```bash
npx prisma generate
npx prisma migrate deploy
```

### "Still getting images error"
- Check you deployed the FIXED version
- Check Render logs for the request body
- Should say `"images": [...]` not `"image": [...]`

### "Authentication failed"
- Check your `WAVESPEED_API_KEY` in Render environment variables
- Make sure it's the correct key from https://wavespeed.ai/account/api-keys

### "No credits"
- Go to https://wavespeed.ai/account/billing
- Add credits to your WaveSpeed account

---

## ✅ SUCCESS CHECKLIST:

- [ ] Extracted modelclone-fixed.zip
- [ ] Added WAVESPEED_API_KEY to .env
- [ ] Pushed to GitHub
- [ ] Deployed to Render
- [ ] Added environment variables
- [ ] Created PostgreSQL database
- [ ] Tested /api/health endpoint
- [ ] Generated test image
- [ ] Checked Render logs show "Task submitted!"

---

## 🎉 YOU'RE DONE!

Your backend is now live and working with WaveSpeed API!

**Questions? Issues? Send me the Render logs!** 🚀
