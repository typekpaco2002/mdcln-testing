import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const data = {
  "user": {
    "id": "9eae9dac-ab32-40e9-83fe-7dca0e8243aa",
    "email": "mconqueror17@gmail.com",
    "password": null,
    "name": "Martin",
    "role": "admin",
    "authProvider": "google",
    "googleId": "PQek2Y9p1AO0MXbzMHwx3bDO1sL2",
    "isVerified": true,
    "verificationCode": null,
    "codeExpiresAt": null,
    "resetCode": null,
    "resetCodeExpiresAt": null,
    "subscriptionTier": null,
    "subscriptionStatus": "active",
    "subscriptionBillingCycle": null,
    "stripeCustomerId": null,
    "stripeSubscriptionId": null,
    "maxModels": 999,
    "subscriptionCredits": 49767,
    "purchasedCredits": 1,
    "creditsExpireAt": null,
    "credits": 0,
    "totalCreditsUsed": 252,
    "imageCredits": 0,
    "videoCredits": 0,
    "imagesUsed": 0,
    "videosUsed": 0,
    "twoFactorEnabled": false,
    "twoFactorSecret": null,
    "onboardingCompleted": true,
    "hasUsedFreeTrial": false,
    "freeTrialGenerationId": null,
    "specialOfferEligible": true,
    "specialOfferLockedAt": "2026-02-26T12:32:38.508Z",
    "freeVideosCompleted": 0,
    "allowCustomLoraTrainingPhotos": true,
    "premiumFeaturesUnlocked": false,
    "referralCode": null,
    "referredByUserId": null,
    "subscriptionCancelledAt": null,
    "firstSaleAt": null,
    "firstSaleEventType": null,
    "affiliateBlocked": false,
    "createdAt": "2026-02-26T12:32:29.645Z",
    "updatedAt": "2026-03-02T17:12:57.332Z"
  },
  "savedModels": [
    {
      "id": "eae4ac75-c67e-4068-a5be-724d87bb0947",
      "userId": "9eae9dac-ab32-40e9-83fe-7dca0e8243aa",
      "name": "gingerella",
      "status": "ready",
      "photo1Url": "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/uploads/1772434818959_imfv9qre.jpg",
      "photo2Url": "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/uploads/1772434838928_yumd41l8.jpg",
      "photo3Url": "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/uploads/1772434853659_q6dk2ej7.jpg",
      "thumbnail": "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/uploads/1772434818959_imfv9qre.jpg",
      "isAIGenerated": false,
      "aiGenerationParams": null,
      "loraStatus": "ready",
      "loraSessionPaid": false,
      "loraUrl": "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/loras/gingerella_1772468535254.safetensors",
      "loraTriggerWord": "lora_gingerella",
      "loraTrainedAt": "2026-03-02T16:22:44.653Z",
      "loraFalRequestId": "5a8b9572-3ec4-480e-8879-a65dff636171",
      "loraError": null,
      "nsfwUnlocked": true,
      "nsfwOverride": true,
      "paymentIntentId": null,
      "faceReferenceUrl": null,
      "age": 20,
      "savedAppearance": null,
      "activeLoraId": "9381716f-2d08-4ebd-b2a0-3db1dae324f7",
      "createdAt": "2026-03-02T07:01:07.215Z",
      "updatedAt": "2026-03-02T16:29:13.259Z"
    }
  ],
  "trainedLoras": [
    {
      "id": "f281ea78-6d56-4476-9499-8c183c4000d8",
      "modelId": "eae4ac75-c67e-4068-a5be-724d87bb0947",
      "name": "lora_gingerella",
      "status": "ready",
      "trainingMode": "standard",
      "loraUrl": "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/loras/gingerella_1772461332583.safetensors",
      "triggerWord": "lora_gingerella",
      "trainedAt": "2026-03-02T14:22:27.514Z",
      "falRequestId": "48cc1a0c-5f39-485b-a407-3595a28a0eb4",
      "error": null,
      "faceReferenceUrl": null,
      "defaultAppearance": {"lipSize":"full lips","bodyType":"athletic body","eyeColor":"green eyes","hairType":"medium length hair","skinTone":"light skin","hairColor":"red hair","breastSize":"small perky breasts"},
      "createdAt": "2026-03-02T13:16:25.977Z",
      "updatedAt": "2026-03-02T14:59:30.485Z"
    },
    {
      "id": "9381716f-2d08-4ebd-b2a0-3db1dae324f7",
      "modelId": "eae4ac75-c67e-4068-a5be-724d87bb0947",
      "name": "lora_ginga2",
      "status": "ready",
      "trainingMode": "pro",
      "loraUrl": "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/loras/gingerella_1772468535254.safetensors",
      "triggerWord": "lora_gingerella",
      "trainedAt": "2026-03-02T16:22:44.653Z",
      "falRequestId": "5a8b9572-3ec4-480e-8879-a65dff636171",
      "error": null,
      "faceReferenceUrl": null,
      "defaultAppearance": {"lipSize":"full lips","bodyType":"hourglass body","eyeColor":"green eyes","hairType":"long curly hair","skinTone":"light skin","hairColor":"red hair","breastSize":"small perky breasts"},
      "createdAt": "2026-03-02T15:05:09.073Z",
      "updatedAt": "2026-03-02T16:22:44.654Z"
    }
  ],
  "loraTrainingImages": [],
  "creditTransactions": [
    {
      "id": "66e1a4f7-dd1c-4acb-97bd-1c9e37de9bc0",
      "userId": "9eae9dac-ab32-40e9-83fe-7dca0e8243aa",
      "amount": 250,
      "type": "first_lora_bonus",
      "description": "First LoRA training bonus - 250 free credits",
      "paymentSessionId": null,
      "emailSentAt": null,
      "createdAt": "2026-03-02T14:22:27.630Z"
    }
  ],
  "generations": [
    {
      "id": "2651f6b0-a84e-489f-9833-acf23594f9dc",
      "userId": "9eae9dac-ab32-40e9-83fe-7dca0e8243aa",
      "modelId": "eae4ac75-c67e-4068-a5be-724d87bb0947",
      "type": "image",
      "prompt": "gingerella lies back on a plain white surface...",
      "duration": null,
      "resolution": null,
      "creditsCost": 1,
      "creditsRefunded": true,
      "actualCostUSD": null,
      "inputImageUrl": "{\"identityImages\":[\"https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/uploads/1772434818959_imfv9qre.jpg\"],\"targetImage\":\"https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/uploads/1772471392672_sd6r8ngf.png\"}",
      "inputVideoUrl": null,
      "outputUrl": null,
      "replicateModel": "kie-seedream-v4.5-edit",
      "status": "failed",
      "errorMessage": "kie.ai task timed out after 80 attempts",
      "isTrial": false,
      "isNsfw": false,
      "createdAt": "2026-03-02T17:10:00.008Z",
      "completedAt": null
    },
    {
      "id": "1aa1421a-17e9-4a4a-8bb9-1e2ae1d0445f",
      "userId": "9eae9dac-ab32-40e9-83fe-7dca0e8243aa",
      "modelId": "eae4ac75-c67e-4068-a5be-724d87bb0947",
      "type": "nsfw",
      "prompt": "lora_gingerella, mirror selfie in bathroom",
      "duration": null,
      "resolution": null,
      "creditsCost": 2,
      "creditsRefunded": false,
      "actualCostUSD": null,
      "inputImageUrl": "{\"comfyuiPromptId\":\"25b533a3-cabf-416c-ba11-9c15a375442b-u2\"}",
      "inputVideoUrl": null,
      "outputUrl": "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/nsfw-generations/1772468903538_hgasu32e.png",
      "replicateModel": "comfyui-nsfw",
      "status": "completed",
      "errorMessage": null,
      "isTrial": false,
      "isNsfw": true,
      "createdAt": "2026-03-02T16:26:20.786Z",
      "completedAt": "2026-03-02T16:28:24.709Z"
    },
    {
      "id": "73568731-be98-44d0-b047-0898ece4a3e0",
      "userId": "9eae9dac-ab32-40e9-83fe-7dca0e8243aa",
      "modelId": "eae4ac75-c67e-4068-a5be-724d87bb0947",
      "type": "nsfw",
      "prompt": "lora_gingerella, mirror selfie in bathroom 2",
      "duration": null,
      "resolution": null,
      "creditsCost": 3,
      "creditsRefunded": false,
      "actualCostUSD": null,
      "inputImageUrl": "{\"comfyuiPromptId\":\"32ba9010-03a9-4d34-990a-6f80bb98cc4d-u2\"}",
      "inputVideoUrl": null,
      "outputUrl": "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/nsfw-generations/1772468882149_vzhy33uu.png",
      "replicateModel": "comfyui-nsfw",
      "status": "completed",
      "errorMessage": null,
      "isTrial": false,
      "isNsfw": true,
      "createdAt": "2026-03-02T16:26:10.149Z",
      "completedAt": "2026-03-02T16:28:03.166Z"
    },
    {
      "id": "27077e21-baa4-4077-8eab-772eb416b1bd",
      "userId": "9eae9dac-ab32-40e9-83fe-7dca0e8243aa",
      "modelId": "eae4ac75-c67e-4068-a5be-724d87bb0947",
      "type": "nsfw",
      "prompt": "lora_gingerella, lying on bed fully nude",
      "duration": null,
      "resolution": null,
      "creditsCost": 3,
      "creditsRefunded": false,
      "actualCostUSD": null,
      "inputImageUrl": "{\"comfyuiPromptId\":\"52b503f8-1d6d-4c78-b5e1-ba9f8fab037e-u1\"}",
      "inputVideoUrl": null,
      "outputUrl": "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/nsfw-generations/1772462467318_yre4xixj.png",
      "replicateModel": "comfyui-nsfw",
      "status": "completed",
      "errorMessage": null,
      "isTrial": false,
      "isNsfw": true,
      "createdAt": "2026-03-02T14:40:14.171Z",
      "completedAt": "2026-03-02T14:41:09.367Z"
    },
    {
      "id": "e8a399db-060a-4c38-9330-1d2250b319e8",
      "userId": "9eae9dac-ab32-40e9-83fe-7dca0e8243aa",
      "modelId": "eae4ac75-c67e-4068-a5be-724d87bb0947",
      "type": "nsfw",
      "prompt": "lora_gingerella, mirror selfie arched back",
      "duration": null,
      "resolution": null,
      "creditsCost": 3,
      "creditsRefunded": false,
      "actualCostUSD": null,
      "inputImageUrl": "{\"comfyuiPromptId\":\"f9c3a6e2-14e3-420a-a589-61409b4ca4bf-u1\"}",
      "inputVideoUrl": null,
      "outputUrl": "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/nsfw-generations/1772462171825_tfbnt8fq.png",
      "replicateModel": "comfyui-nsfw",
      "status": "completed",
      "errorMessage": null,
      "isTrial": false,
      "isNsfw": true,
      "createdAt": "2026-03-02T14:34:14.718Z",
      "completedAt": "2026-03-02T14:36:13.218Z"
    },
    {
      "id": "8c0f8958-0057-41b2-9e89-3733e19eee80",
      "userId": "9eae9dac-ab32-40e9-83fe-7dca0e8243aa",
      "modelId": "eae4ac75-c67e-4068-a5be-724d87bb0947",
      "type": "nsfw",
      "prompt": "lora_gingerella, mirror selfie shy expression",
      "duration": null,
      "resolution": null,
      "creditsCost": 3,
      "creditsRefunded": false,
      "actualCostUSD": null,
      "inputImageUrl": "{\"comfyuiPromptId\":\"264f2f16-b7e3-4eba-aa7b-5e2eb9ac9578-u2\"}",
      "inputVideoUrl": null,
      "outputUrl": "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/nsfw-generations/1772461833342_hiz8hvpo.png",
      "replicateModel": "comfyui-nsfw",
      "status": "completed",
      "errorMessage": null,
      "isTrial": false,
      "isNsfw": true,
      "createdAt": "2026-03-02T14:29:40.738Z",
      "completedAt": "2026-03-02T14:30:33.342Z"
    },
    {
      "id": "e8479391-2562-4c5d-855b-e49bbc76b444",
      "userId": "9eae9dac-ab32-40e9-83fe-7dca0e8243aa",
      "modelId": "eae4ac75-c67e-4068-a5be-724d87bb0947",
      "type": "nsfw",
      "prompt": "lora_gingerella, mirror selfie playful expression",
      "duration": null,
      "resolution": null,
      "creditsCost": 3,
      "creditsRefunded": false,
      "actualCostUSD": null,
      "inputImageUrl": "{\"comfyuiPromptId\":\"2432d4ce-0de9-4693-92a0-305c0ebe21f0-u1\"}",
      "inputVideoUrl": null,
      "outputUrl": "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/nsfw-generations/1772461636455_wmnfc6a3.png",
      "replicateModel": "comfyui-nsfw",
      "status": "completed",
      "errorMessage": null,
      "isTrial": false,
      "isNsfw": true,
      "createdAt": "2026-03-02T14:26:15.711Z",
      "completedAt": "2026-03-02T14:27:17.217Z"
    }
  ],
  "draftTasks": [
    {
      "id": "cmm8x69hf0001p9tan3nh4xq6",
      "userId": "9eae9dac-ab32-40e9-83fe-7dca0e8243aa",
      "feature": "generate-image",
      "data": {"imageMode":"identity","clothesMode":"reference","targetImage":"https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/uploads/1772471392672_sd6r8ngf.png","advancedModel":"seedream","selectedModel":"eae4ac75-c67e-4068-a5be-724d87bb0947","advancedPrompt":"","faceSwapSourceImage":null,"faceSwapTargetImage":null,"identityDescription":"gingerella draft","advancedReferencePhotos":[]},
      "imageUrls": ["https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/uploads/1772471392672_sd6r8ngf.png"],
      "updatedAt": "2026-03-02T17:10:00.635Z"
    },
    {
      "id": "cmm8xxvpy0003p9c9l20ly92y",
      "userId": "9eae9dac-ab32-40e9-83fe-7dca0e8243aa",
      "feature": "generate-video",
      "data": {"method":"talking-head","faceImage":null,"sourceVideo":null,"targetGender":"female","selectedModel":"eae4ac75-c67e-4068-a5be-724d87bb0947","selectedVoice":"vz3dx89akMq5gofrv9Bi","languageFilter":"en","referenceVideo":null,"talkingHeadText":"","promptVideoImage":null,"talkingHeadImage":null,"promptVideoPrompt":"","talkingHeadPrompt":"","keepAudioFromVideo":true,"videoStartingImage":"https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/uploads/1772441564561_8grwjlqn.png","promptVideoDuration":5},
      "imageUrls": ["https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/uploads/1772441564561_8grwjlqn.png"],
      "updatedAt": "2026-03-02T14:01:35.745Z"
    },
    {
      "id": "cmm9e5lvs0009p91rtf80ot0h",
      "userId": "9eae9dac-ab32-40e9-83fe-7dca0e8243aa",
      "feature": "nsfw",
      "data": {"genConfig":{"loraStrength":0.65},"activePhase":"generate","skipFaceSwap":true,"currentLoraId":"9381716f-2d08-4ebd-b2a0-3db1dae324f7","faceSwapImage":null,"selectedModel":"eae4ac75-c67e-4068-a5be-724d87bb0947","chipSelections":{"flash":"phone flash on harsh frontal light"},"selectedPreset":"mirror_selfie","sceneDescription":"","trainingSelections":[],"selectedAspectRatio":"576x1024"},
      "imageUrls": [],
      "updatedAt": "2026-03-02T16:29:30.348Z"
    }
  ]
};

async function main() {
  console.log('Starting import for:', data.user.email);

  // Upsert user
  await prisma.user.upsert({
    where: { id: data.user.id },
    update: {},
    create: {
      id: data.user.id,
      email: data.user.email,
      password: data.user.password,
      name: data.user.name,
      role: data.user.role,
      authProvider: data.user.authProvider,
      googleId: data.user.googleId,
      isVerified: data.user.isVerified,
      verificationCode: data.user.verificationCode,
      codeExpiresAt: data.user.codeExpiresAt ? new Date(data.user.codeExpiresAt) : null,
      resetCode: data.user.resetCode,
      resetCodeExpiresAt: data.user.resetCodeExpiresAt ? new Date(data.user.resetCodeExpiresAt) : null,
      subscriptionTier: data.user.subscriptionTier,
      subscriptionStatus: data.user.subscriptionStatus,
      subscriptionBillingCycle: data.user.subscriptionBillingCycle,
      stripeCustomerId: data.user.stripeCustomerId,
      stripeSubscriptionId: data.user.stripeSubscriptionId,
      maxModels: data.user.maxModels,
      subscriptionCredits: data.user.subscriptionCredits,
      purchasedCredits: data.user.purchasedCredits,
      creditsExpireAt: data.user.creditsExpireAt ? new Date(data.user.creditsExpireAt) : null,
      credits: data.user.credits,
      totalCreditsUsed: data.user.totalCreditsUsed,
      imageCredits: data.user.imageCredits,
      videoCredits: data.user.videoCredits,
      imagesUsed: data.user.imagesUsed,
      videosUsed: data.user.videosUsed,
      twoFactorEnabled: data.user.twoFactorEnabled,
      twoFactorSecret: data.user.twoFactorSecret,
      onboardingCompleted: data.user.onboardingCompleted,
      hasUsedFreeTrial: data.user.hasUsedFreeTrial,
      freeTrialGenerationId: data.user.freeTrialGenerationId,
      specialOfferEligible: data.user.specialOfferEligible,
      specialOfferLockedAt: data.user.specialOfferLockedAt ? new Date(data.user.specialOfferLockedAt) : null,
      freeVideosCompleted: data.user.freeVideosCompleted,
      allowCustomLoraTrainingPhotos: data.user.allowCustomLoraTrainingPhotos,
      premiumFeaturesUnlocked: data.user.premiumFeaturesUnlocked,
      referralCode: data.user.referralCode,
      referredByUserId: data.user.referredByUserId,
      subscriptionCancelledAt: data.user.subscriptionCancelledAt ? new Date(data.user.subscriptionCancelledAt) : null,
      firstSaleAt: data.user.firstSaleAt ? new Date(data.user.firstSaleAt) : null,
      firstSaleEventType: data.user.firstSaleEventType,
      affiliateBlocked: data.user.affiliateBlocked,
      createdAt: new Date(data.user.createdAt),
      updatedAt: new Date(data.user.updatedAt),
    }
  });
  console.log('✓ User imported');

  // SavedModels
  for (const m of data.savedModels) {
    await prisma.savedModel.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        userId: m.userId,
        name: m.name,
        status: m.status,
        photo1Url: m.photo1Url,
        photo2Url: m.photo2Url,
        photo3Url: m.photo3Url,
        thumbnail: m.thumbnail,
        isAIGenerated: m.isAIGenerated,
        aiGenerationParams: m.aiGenerationParams ? JSON.stringify(m.aiGenerationParams) : null,
        loraStatus: m.loraStatus,
        loraSessionPaid: m.loraSessionPaid,
        loraUrl: m.loraUrl,
        loraTriggerWord: m.loraTriggerWord,
        loraTrainedAt: m.loraTrainedAt ? new Date(m.loraTrainedAt) : null,
        loraFalRequestId: m.loraFalRequestId,
        loraError: m.loraError,
        nsfwUnlocked: m.nsfwUnlocked,
        nsfwOverride: m.nsfwOverride,
        paymentIntentId: m.paymentIntentId,
        faceReferenceUrl: m.faceReferenceUrl,
        age: m.age,
        savedAppearance: m.savedAppearance ? JSON.stringify(m.savedAppearance) : null,
        activeLoraId: m.activeLoraId,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
      }
    });
  }
  console.log(`✓ ${data.savedModels.length} saved model(s) imported`);

  // TrainedLoras
  for (const l of data.trainedLoras) {
    await prisma.trainedLora.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        modelId: l.modelId,
        name: l.name,
        status: l.status,
        trainingMode: l.trainingMode,
        loraUrl: l.loraUrl,
        triggerWord: l.triggerWord,
        trainedAt: l.trainedAt ? new Date(l.trainedAt) : null,
        falRequestId: l.falRequestId,
        error: l.error,
        faceReferenceUrl: l.faceReferenceUrl,
        defaultAppearance: l.defaultAppearance ? JSON.stringify(l.defaultAppearance) : null,
        createdAt: new Date(l.createdAt),
        updatedAt: new Date(l.updatedAt),
      }
    });
  }
  console.log(`✓ ${data.trainedLoras.length} trained LoRA(s) imported`);

  // CreditTransactions
  for (const t of data.creditTransactions) {
    await prisma.creditTransaction.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        userId: t.userId,
        amount: t.amount,
        type: t.type,
        description: t.description,
        paymentSessionId: t.paymentSessionId,
        emailSentAt: t.emailSentAt ? new Date(t.emailSentAt) : null,
        createdAt: new Date(t.createdAt),
      }
    });
  }
  console.log(`✓ ${data.creditTransactions.length} credit transaction(s) imported`);

  // Generations
  for (const g of data.generations) {
    await prisma.generation.upsert({
      where: { id: g.id },
      update: {},
      create: {
        id: g.id,
        userId: g.userId,
        modelId: g.modelId,
        type: g.type,
        prompt: g.prompt,
        duration: g.duration,
        resolution: g.resolution,
        creditsCost: g.creditsCost,
        creditsRefunded: g.creditsRefunded,
        actualCostUSD: g.actualCostUSD,
        inputImageUrl: g.inputImageUrl,
        inputVideoUrl: g.inputVideoUrl,
        outputUrl: g.outputUrl,
        replicateModel: g.replicateModel,
        status: g.status,
        errorMessage: g.errorMessage,
        isTrial: g.isTrial,
        isNsfw: g.isNsfw,
        createdAt: new Date(g.createdAt),
        completedAt: g.completedAt ? new Date(g.completedAt) : null,
      }
    });
  }
  console.log(`✓ ${data.generations.length} generation(s) imported`);

  // DraftTasks — SQLite stores data/imageUrls as String
  for (const d of data.draftTasks) {
    await prisma.draftTask.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        userId: d.userId,
        feature: d.feature,
        data: JSON.stringify(d.data),
        imageUrls: JSON.stringify(d.imageUrls),
        updatedAt: new Date(d.updatedAt),
      }
    });
  }
  console.log(`✓ ${data.draftTasks.length} draft task(s) imported`);

  console.log('\n✅ Import complete! User mconqueror17@gmail.com is ready.');
}

main()
  .catch(e => { console.error('Import failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
