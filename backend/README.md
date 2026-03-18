# 🎉 MODEL CLONE - YOUR EXACT WORKFLOW

This is your complete backend with **YOUR EXACT WORKFLOW** from WaveSpeed.

## ✅ What This Does

### Your Workflow (Built-In):

**Step 1: Identity Preservation**
- Input: 3 photos of YOUR model + 1 target pose/scene
- Uses YOUR exact prompt
- Output: Target recreated with YOUR model

**Step 2: Motion Transfer**
- Input: Generated image + reference video  
- Output: Your model doing the video's movements

**Complete Pipeline:**
- Does both steps in one API call!

---

## 🚀 SETUP INSTRUCTIONS

### 1. Extract the Files

You should already have this folder extracted. You should see:
- `src/` folder
- `prisma/` folder
- `package.json`
- `.env`
- This `README.md`

### 2. Install Node.js (If Needed)

Check if you have it:
```bash
node --version
```

If not, download from https://nodejs.org (get the LTS version)

### 3. Install Dependencies

Open terminal in this folder and run:
```bash
npm install
```

This takes 1-2 minutes.

### 4. Set Up Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

When it asks for migration name, just press Enter.

### 5. Start the Server

```bash
npm run dev
```

You should see:
```
🚀 MODEL CLONE - YOUR WORKFLOW
📡 Server: http://localhost:3000
🔑 Replicate: ✅ Configured

YOUR WORKFLOW ENDPOINTS:
   POST /api/generate/image-identity       - Step 1
   POST /api/generate/video-motion         - Step 2  
   POST /api/generate/complete-recreation  - Both ⭐
```

### 6. Test It

Open http://localhost:3000/api/health in your browser.

You should see:
```json
{
  "success": true,
  "message": "Model Clone API is running",
  "workflow": "Your exact WaveSpeed workflow"
}
```

---

## 🎯 API ENDPOINTS

### Create Account
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User"
  }'
```

Save the `token` from the response!

### Complete Recreation (Your Full Workflow)
```bash
curl -X POST http://localhost:3000/api/generate/complete-recreation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "modelIdentityImages": [
      "https://example.com/model1.jpg",
      "https://example.com/model2.jpg",
      "https://example.com/model3.jpg"
    ],
    "videoScreenshot": "https://example.com/screenshot.jpg",
    "originalVideoUrl": "https://example.com/video.mp4",
    "videoPrompt": ""
  }'
```

---

## 📝 YOUR WORKFLOW EXPLAINED

### What You Do on WaveSpeed:
1. Upload 3 photos of YOUR model
2. Upload 1 screenshot from video you want to recreate
3. Use your prompt
4. Get recreated image
5. Upload image + original video
6. Get animated video

### What This API Does:
Same thing, but automated! One API call = both steps.

### Your Prompt (Built-In):
```
"recreate image 4 using identity from images 1, 2 and 3. 
keep clothes, pose and background from image 4. 
don't keep clothes or accessories from images 1, 2 and 3."
```

Already coded into `src/services/replicate.service.js`

---

## 🚀 DEPLOY TO RENDER

### Step 1: Push to GitHub

```bash
# Initialize git
git init

# Add files
git add .
git commit -m "Model Clone backend - your workflow"

# Create repo on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/model-clone.git
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to https://render.com
2. Sign up with GitHub
3. New Web Service
4. Connect your repo
5. Settings:
   - Build: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Start: `npm start`
6. Add environment variables:
   - `REPLICATE_API_TOKEN` = `your-replicate-api-token-here`
   - `JWT_SECRET` = `your-random-secret-here`
   - `NODE_ENV` = `production`
7. Create PostgreSQL database
8. Connect database (copy DATABASE_URL)
9. Deploy!

---

## 💰 COSTS

### Render:
- Free tier (for testing)
- $7/mo (for production)

### Replicate:
- Image (Seedream V4): ~$0.027
- Video (WAN 2.2): ~$0.15-0.30

**Add $10-20 to your Replicate account!**

---

## 📁 PROJECT STRUCTURE

```
modelclone/
├── src/
│   ├── services/
│   │   └── replicate.service.js    ← YOUR WORKFLOW
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   └── generation.controller.js
│   ├── middleware/
│   │   └── auth.middleware.js
│   ├── routes/
│   │   └── api.routes.js
│   └── server.js
├── prisma/
│   └── schema.prisma
├── .env                             ← Your API key
├── package.json
└── README.md                        ← You are here
```

---

## 🆘 TROUBLESHOOTING

### "npm: command not found"
→ Install Node.js from nodejs.org

### "Prisma migrate failed"
→ Make sure you ran `npx prisma generate` first

### "Replicate API error"
→ Check you have credits in your Replicate account

### "401 Unauthorized"
→ Make sure you include the token: `Authorization: Bearer YOUR_TOKEN`

---

## ✅ WHAT'S NEXT

1. ✅ Backend running
2. 🔨 Build frontend (React app)
3. 💳 Add Stripe payments
4. 🖼️ Add file upload
5. 🚀 Launch!

---

## 🎉 YOU'RE READY!

Your exact WaveSpeed workflow is now automated and ready to scale!

**Questions? Need help? Just ask!** 🚀
