# ModelClone - AI Generation Workflows Documentation

## Overview
ModelClone provides 4 AI-powered generation tabs for creating custom content. Each tab uses WaveSpeed API (Silver tier: 20 concurrent tasks max) with different workflows and credit costs.

---

## Tab 1: Image Generation (Identity Recreation)

### Purpose
Recreate a target image while preserving the user's face identity and features.

### Workflow
1. **User selects a face model** (created from 3 uploaded photos)
2. **User uploads target image** (the scene/pose they want to recreate)
3. **User selects quantity** (1-10 images)
4. **User optionally emphasizes features** via checkboxes:
   - Tattoos
   - Hair color
   - Hairstyle
   - Facial hair
   - Eye color
   - Piercings
   - Makeup
   - Glasses
5. **System generates images** using Seedream V4 Edit model

### Technical Flow
```
Frontend: ImageGeneration component
   ↓
API: POST /api/generate/image-identity
   ↓
Backend: generateImageWithIdentity(req, res)
   ↓
Service: wavespeed.generateImageWithIdentity()
   ↓
Model: seedream-v4-edit
```

### Credit Cost
- **3 credits per image**
- Quantity 1-10 = 3-30 credits total
- Credits deducted upfront atomically
- Auto-refunded on failure (triple-layer safety)

### Key Features
- **Batch generation**: Up to 10 images at once
- **Feature preservation**: Checkboxes add emphasis to prompt
- **Default prompt**: "recreate image 4 using identity from images 1, 2 and 3. keep clothes, pose and background from image 4. don't keep clothes or accessories from images 1, 2 and 3."
- **Custom prompts**: User can override default prompt

### Output
- High-resolution images (2K)
- Preserves target scene/pose/clothing
- Replaces face with user's model identity

---

## Tab 2: Prompt-Based Image Generation

### Purpose
Generate creative images from text descriptions using AI-enhanced prompts.

### Workflow
1. **User selects a face model**
2. **User selects Content Rating**:
   - **PG-13**: Family-friendly, modest clothing
   - **Sexy**: Revealing attire, seductive poses
3. **User selects Photo Style**:
   - **Professional**: Intentional photoshoot, editorial quality, bokeh background
   - **Amateur**: Casual snapshot, spontaneous, friend taking photo
4. **User enters prompt** (keywords or description)
5. **User optionally enhances prompt** using AI (OpenAI GPT-4o-mini)
6. **User selects quantity** (1-10 images)
7. **System generates images**

### Technical Flow
```
Frontend: PromptImageGeneration component
   ↓
Optional: POST /api/generate/enhance-prompt (AI enhancement)
   ↓
API: POST /api/generate/prompt-image
   ↓
Backend: generatePromptBasedImage(req, res)
   ↓
Service: wavespeed.generateImageWithIdentity()
   ↓
Model: seedream-v4-edit
```

### Credit Cost
- **3 credits per image**
- Quantity 1-10 = 3-30 credits total

### Key Features
- **AI Prompt Enhancement**: 
  - Transforms simple keywords into detailed scene descriptions
  - Respects content rating (adds explicit clothing guidance for Sexy mode)
  - Incorporates photo style (professional vs amateur vibe)
- **Content Rating System**:
  - PG-13: Modest clothing covering shoulders/knees
  - Sexy: Mini dresses, bikinis, lingerie, crop tops
- **Style System**:
  - Professional: Artistic photoshoot, magazine quality
  - Amateur: Spontaneous moment, playful energy

### Prompt Enhancement Example
```
User input: "beach sunset"
Content Rating: Sexy
Style: Professional

AI Enhanced Output: "Professional photoshoot at beach during golden hour 
sunset, model wearing revealing bikini top and mini shorts showing 
significant skin, seductive pose with one hip out, intentional artistic 
composition, editorial magazine quality, shallow depth of field with 
bokeh background blur"
```

### Output
- Creative images matching user's vision
- Face replaced with user's model
- Rating-appropriate clothing and poses

---

## Tab 3: Video Generation (TikTok/Reels)

### Purpose
Generate short-form vertical videos (720p, 9:16 format) for TikTok/Instagram Reels.

### Two Methods Available

#### Method A: Quick Generation (One-Step)
**Fastest but lower quality - may have "bad frame" issues**

##### Workflow
1. **User selects face model**
2. **User uploads reference video** (motion/scene to recreate)
3. **System generates video directly**

##### Technical Flow
```
Frontend: VideoGeneration component (Quick method)
   ↓
API: POST /api/generate/video-directly
   ↓
Backend: generateVideoDirectly(req, res)
   ↓
Service: wavespeed.generateVideoWithMotion()
   ↓
Model: wan-2.2-animate
```

##### Credit Cost
- **20 credits** (fixed)

---

#### Method B: Professional 2-Step Method (Recommended)
**Higher quality - user picks best frame to avoid bad frames**

##### Workflow - Step 1: Extract & Recreate Frame
1. **User selects face model**
2. **User uploads reference video**
3. **System extracts 10 frames** at different timestamps (FREE)
4. **User selects best frame** from extracted frames
5. **System recreates frame** with user's face using Seedream V4 Edit

##### Technical Flow (Step 1)
```
Frontend: VideoGeneration component (2-step method, Step 1)
   ↓
API 1: POST /api/generate/extract-frames (FREE)
   ↓
Backend: extractVideoFrames(req, res)
   ↓
Service: video.extractFramesFromVideo()
   ↓
Returns: 10 frame images at 1fps intervals

User picks best frame
   ↓
API 2: POST /api/generate/complete-recreation
   ↓
Backend: generateCompleteRecreation(req, res)
   ↓
Service: wavespeed.generateImageWithIdentity()
   ↓
Model: seedream-v4-edit
```

##### Credit Cost (Step 1)
- **Frame extraction: FREE**
- **Frame recreation: 3 credits**

---

##### Workflow - Step 2: Generate Final Video
1. **User uses recreated high-quality image** from Step 1
2. **System generates final video** using WAN 2.2 Animate

##### Technical Flow (Step 2)
```
Frontend: VideoGeneration component (2-step method, Step 2)
   ↓
API: POST /api/generate/video-motion
   ↓
Backend: generateVideoWithMotion(req, res)
   ↓
Service: wavespeed.generateVideoWithMotion()
   ↓
Model: wan-2.2-animate
```

##### Credit Cost (Step 2)
- **20 credits**

---

### 2-Step Method Total Cost
- **Frame extraction**: FREE
- **Frame recreation**: 3 credits
- **Video generation**: 20 credits
- **TOTAL**: **23 credits** per video

### Why 2-Step Method?
WAN 2.2's automatic frame extraction often selects poor-quality frames, resulting in low-quality videos. The 2-step method ensures:
- User manually selects best frame
- Frame is recreated with high quality
- Final video uses professional starting point
- Eliminates "bad frame" artifacts

### Output Format
- **Resolution**: 720p vertical
- **Aspect Ratio**: 9:16 (TikTok/Reels format)
- **Quality**: Optimized for social media
- **Duration**: ~5 seconds typical

---

## Tab 4: Face Swap Generation

### Purpose
Swap faces in existing videos with the user's model face.

### Workflow
1. **User selects face model**
2. **User uploads source video** (video with face to swap)
3. **System detects video duration** automatically
4. **User optionally filters by target gender**:
   - All genders
   - Male faces only
   - Female faces only
5. **System swaps all detected faces**

### Technical Flow
```
Frontend: FaceSwapGeneration component
   ↓
Video duration detected in browser (via HTML5 video element)
   ↓
API: POST /api/generate/face-swap
   ↓
Backend: generateFaceSwap(req, res)
   ↓
Service: wavespeed.faceSwapVideo()
   ↓
Model: face-swap-v1
```

### Credit Cost
- **1 credit per second of video**
- Example: 30-second video = 30 credits
- Duration calculated automatically in frontend
- Credits deducted upfront based on actual duration

### Key Features
- **Automatic face detection**: Finds all faces in video
- **Gender filtering**: Swap only male or female faces
- **Duration-based pricing**: Fair pricing by video length
- **Batch face swap**: All detected faces swapped at once

### Output
- Same video format as input
- All target faces replaced with user's model
- Maintains original video quality
- Preserves audio and background

---

## Backend Credit System (Production-Safe)

### Safety Guarantees
All generation endpoints implement triple-layer safety:

#### 1. Upfront Deduction (Atomic)
```javascript
// Credits deducted BEFORE API call
await deductCredits(userId, creditsNeeded);
```

#### 2. Triple-Layer Refund Protection
```javascript
try {
  // Layer 1: Immediate refund if record creation fails
  if (!generationRecord) {
    await refundCredits(userId, creditsNeeded);
  }
  
  // Layer 2: Record-based refund if API call fails
  if (!apiResult.success) {
    await refundGeneration(generationId); // Atomic, prevents double refunds
  }
  
} catch (error) {
  // Layer 3: Emergency refund on unexpected errors
  await refundAllFailedGenerations();
}
```

#### 3. Stuck Generation Cleanup
- On server startup, refunds ALL stuck generations (>10 minutes)
- Uses atomic `refundGeneration()` to prevent double refunds
- Ensures zero credit loss for users

### Request Queue System
- **Max concurrent**: 20 tasks (Silver tier limit)
- **Queue timeout**: 10 minutes
- **Protected endpoints**: All generation endpoints
- **Purpose**: Prevent 429 errors and server overload

---

## Generation Status Tracking

### Background Poller Service
- **Server-side**: Polls WaveSpeed API every 5 seconds
- **Auto-updates**: Updates generation status in database
- **Eliminates race conditions**: No localStorage complexity

### Frontend Tracker
- **Hook**: `useGenerationTracker(type)`
- **Polling**: Frontend polls `/api/generations` every 5 seconds
- **Displays**: Current database state
- **Shared UI**: `GenerationResults` component for consistency

### Status Flow
```
processing → completed (success)
processing → failed (error, credits refunded)
```

---

## API Endpoints Summary

| Tab | Endpoint | Method | Credit Cost |
|-----|----------|--------|-------------|
| Image | `/api/generate/image-identity` | POST | 3/image |
| Prompt | `/api/generate/enhance-prompt` | POST | FREE |
| Prompt | `/api/generate/prompt-image` | POST | 3/image |
| Video (Quick) | `/api/generate/video-directly` | POST | 20 |
| Video (2-Step) | `/api/generate/extract-frames` | POST | FREE |
| Video (2-Step) | `/api/generate/complete-recreation` | POST | 3 |
| Video (2-Step) | `/api/generate/video-motion` | POST | 20 |
| Face Swap | `/api/generate/face-swap` | POST | 1/second |

---

## WaveSpeed Models Used

| Model | Used For | Features |
|-------|----------|----------|
| seedream-v4-edit | Image generation, Frame recreation | Identity preservation, NO negative prompts |
| wan-2.2-animate | Video generation | Motion transfer, 720p vertical output |
| face-swap-v1 | Face swap | Multi-face detection, gender filtering |

**Important**: Seedream V4 Edit does NOT support negative prompts. All content control must be done through positive prompt engineering.

---

## Frontend Components

### Main Component
- **File**: `client/src/pages/GeneratePage.jsx` (1744 lines)
- **Sub-components**:
  - `ImageGeneration()`
  - `PromptImageGeneration()`
  - `VideoGeneration()`
  - `FaceSwapGeneration()`

### Shared Components
- **GenerationResults**: Displays completed generations with preview/download
- **GenerationHistory**: Shows last 5 generations for each type
- **FileUpload**: Handles image/video uploads to Cloudinary

### Custom Hooks
- **useGenerationTracker**: Polls backend for generation status updates
- **usePageVisibility**: Pauses polling when tab inactive (battery optimization)
- **useGenerationHistory**: Fetches recent generations for history display

---

## Error Handling & User Feedback

### Validation Errors (400)
- Missing model selection
- Missing uploads
- Invalid quantity

### Insufficient Credits (403)
- Shows exact credits needed vs available
- Redirects to credit purchase

### API Failures (500)
- Credits automatically refunded
- User notified of failure
- Can retry immediately

### Success Flow
- Toast notification with generation count
- Credits deducted immediately
- Results appear in 1-2 minutes
- Auto-refreshes every 5 seconds

---

## Performance Optimizations

### Queue Management
- Prevents WaveSpeed API overload
- Graceful handling of concurrent requests
- 10-minute timeout protection

### Frontend Polling
- Pauses when tab inactive
- 5-second intervals
- Only fetches user's generations

### Credit System
- Atomic transactions (no race conditions)
- Automatic refunds on failures
- Audit trail in CreditTransactions table

### Background Worker
- Server-side poller runs 24/7
- Updates all generations automatically
- No user action required

---

## Development Notes

### Testing a Workflow
1. Create a face model (3 photos)
2. Navigate to desired tab
3. Upload required files
4. Check credit balance
5. Generate content
6. Monitor status in Generation History
7. Verify credits deducted correctly
8. Check for auto-refund on failures

### Common Issues
- **Bad video frames**: Use 2-Step method instead of Quick
- **Credits not refunded**: Check server logs, cleanup runs on restart
- **Stuck generations**: Automatically refunded after 10 minutes
- **Queue timeout**: Reduce concurrent generations

### File Structure
```
client/src/pages/GeneratePage.jsx (frontend, 1744 lines)
src/controllers/generation.controller.js (backend, 1560 lines)
src/services/wavespeed.service.js (WaveSpeed API integration)
src/services/credit.service.js (credit management)
src/services/queue.service.js (request queue)
src/helpers/generation.helpers.js (unified wrapper)
```

---

## Future Enhancements (Potential)

1. **Real-time progress tracking** (WebSocket instead of polling)
2. **Batch operations** (generate 50+ images at once)
3. **Custom video lengths** (currently ~5 seconds)
4. **HD video output** (1080p+ instead of 720p)
5. **Video style transfer** (artistic filters)
6. **Multi-model videos** (swap multiple people in one video)

---

## Support & Troubleshooting

For credit issues, refunds, or generation failures:
1. Check Generation History for error messages
2. Verify model exists and has 3 photos
3. Check uploaded file formats (images: jpg/png, videos: mp4/mov)
4. Ensure sufficient credits before generation
5. Contact support for stuck generations (auto-refunded after 10min)
