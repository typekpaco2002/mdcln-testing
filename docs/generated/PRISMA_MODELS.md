# Generated: Prisma models

**Schema:** `prisma/schema.prisma`

**Generated at:** 2026-05-16T19:18:16.670Z

## Models (54)

### `AbandonedSignupEmailOffer`

- **Fields (15):** `id`, `userId`, `user`, `email`, `discountCodeId`, `discountCode`, `discountPercent`, `status`, `scheduledFor`, `sentAt`, `convertedAt`, `membershipTxId`, `errorMessage`, `createdAt`, `updatedAt`

### `AdminAuditLog`

- **Fields (8):** `id`, `adminUserId`, `adminEmail`, `action`, `targetType`, `targetId`, `detailsJson`, `createdAt`

### `AffiliateAttribution`

- **Fields (10):** `id`, `userId`, `affiliateId`, `sourceType`, `sourceRef`, `expiresAt`, `createdAt`, `updatedAt`, `affiliate`, `user`

### `AffiliateClick`

- **Fields (9):** `id`, `affiliateId`, `codeSnapshot`, `landingPath`, `ipHash`, `userAgent`, `cookieId`, `createdAt`, `affiliate`

### `AffiliateConversion`

- **Fields (15):** `id`, `userId`, `affiliateId`, `eventType`, `eventRef`, `grossUsd`, `commissionUsd`, `commissionRate`, `status`, `isFirstSale`, `payoutTxHash`, `paidAt`, `createdAt`, `affiliate`, `user`

### `AffiliateLanderPage`

- **Fields (6):** `id`, `suffix`, `published`, `draft`, `createdAt`, `updatedAt`

### `AffiliatePartner`

- **Fields (14):** `id`, `code`, `displayName`, `email`, `isActive`, `payoutChain`, `payoutAddress`, `payoutNote`, `createdAt`, `updatedAt`, `attributions`, `clicks`, `conversions`, `withdrawals`

### `ApiEndpointHealthSnapshot`

- **Fields (11):** `id`, `runId`, `endpointKey`, `method`, `path`, `status`, `checksCount`, `errorRatePct`, `avgLatencyMs`, `message`, `checkedAt`

### `ApiKey`

- **Fields (11):** `id`, `userId`, `user`, `name`, `keyPrefix`, `keyHash`, `encryptedKey`, `corsOrigins`, `lastUsedAt`, `createdAt`, `revokedAt`

### `ApiRequestMetric`

- **Fields (13):** `id`, `method`, `routePath`, `normalizedPath`, `statusCode`, `durationMs`, `userId`, `isAdmin`, `ipHash`, `userAgent`, `requestBytes`, `responseBytes`, `createdAt`

### `AppBranding`

- **Fields (12):** `id`, `appName`, `logoUrl`, `faviconUrl`, `baseUrl`, `tutorialVideoUrl`, `landerDemoVideoUrl`, `termsMarkdown`, `privacyMarkdown`, `cookiesMarkdown`, `createdAt`, `updatedAt`

### `Avatar`

- **Fields (16):** `id`, `userId`, `modelId`, `name`, `status`, `photoUrl`, `heygenGroupId`, `heygenAvatarId`, `errorMessage`, `creditsCost`, `lastBilledAt`, `createdAt`, `updatedAt`, `user`, `model`, `videos`

### `AvatarVideo`

- **Fields (15):** `id`, `userId`, `avatarId`, `script`, `heygenVideoId`, `status`, `outputUrl`, `duration`, `creditsCost`, `errorMessage`, `completedAt`, `createdAt`, `updatedAt`, `user`, `avatar`

### `ChildSafetyIncident`

- **Fields (11):** `id`, `userIdSnapshot`, `usernameSnapshot`, `emailSnapshot`, `ipAddress`, `region`, `routePath`, `generationMode`, `classifierCode`, `promptPreview`, `createdAt`

### `ConverterJob`

- **Fields (10):** `id`, `userId`, `originalFileName`, `outputUrl`, `outputExt`, `status`, `errorMessage`, `createdAt`, `completedAt`, `expiresAt`

### `CreditTransaction`

- **Fields (10):** `id`, `userId`, `amount`, `type`, `description`, `paymentSessionId`, `emailSentAt`, `stripeAccount`, `createdAt`, `user`

### `CryptoPayment`

- **Fields (14):** `id`, `orderId`, `userId`, `credits`, `priceUsd`, `type`, `status`, `invoiceUrl`, `paymentId`, `paidAmount`, `paidCurrency`, `completedAt`, `createdAt`, `user`

### `DiscountCode`

- **Fields (13):** `id`, `code`, `discountType`, `discountValue`, `appliesTo`, `validFrom`, `validUntil`, `maxUses`, `currentUses`, `isActive`, `minPurchaseAmount`, `createdAt`, `updatedAt`

### `DraftTask`

- **Fields (7):** `id`, `userId`, `feature`, `data`, `imageUrls`, `updatedAt`, `user`

### `EmailUnsubscribe`

- **Fields (3):** `id`, `email`, `createdAt`

### `Flow`

- **Fields (12):** `id`, `userId`, `name`, `description`, `nodes`, `edges`, `thumbnail`, `isPublic`, `createdAt`, `updatedAt`, `user`, `runs`

### `FlowRun`

- **Fields (11):** `id`, `flowId`, `userId`, `status`, `nodeResults`, `logs`, `creditsUsed`, `startedAt`, `completedAt`, `flow`, `user`

### `GeneratedVoiceAudio`

- **Fields (26):** `id`, `userId`, `modelId`, `voiceId`, `script`, `characterCount`, `estimatedDurationSec`, `actualDurationSec`, `creditsCost`, `isRegeneration`, `sourceAudioId`, `status`, `audioUrl`, `errorMessage`, `voiceNameSnapshot`, `voiceTypeSnapshot`, `elevenLabsVoiceIdSnapshot`, `previewUrlSnapshot`, `completedAt`, `createdAt`, `updatedAt`, `user`, `model`, `voice`, `sourceAudio`, `regenerations`

### `Generation`

- **Fields (39):** `id`, `userId`, `modelId`, `type`, `prompt`, `duration`, `resolution`, `provider`, `providerTaskId`, `providerModel`, `providerFamily`, `providerMode`, `providerType`, `parentTaskId`, `extendEligible`, `originalGenerationId`, `providerRequest`, `providerResponse`, `creditsCost`, `actualCostUSD`, `inputImageUrl`, `inputVideoUrl`, `outputUrl`, `replicateModel`, `status`, `errorMessage`, `createdAt`, `completedAt`, `creditsRefunded`, `isTrial`, `isNsfw`, `pipelinePayload`, `integratorWebhookUrl`, `integratorWebhookSecret`, `integratorWebhookDeliveredAt`, `originalGeneration`, `extensions`, `model`, `user`

### `GenerationPricingConfig`

- **Fields (4):** `id`, `values`, `createdAt`, `updatedAt`

### `GptxConversation`

- **Fields (7):** `id`, `userId`, `title`, `createdAt`, `updatedAt`, `user`, `messages`

### `GptxMessage`

- **Fields (8):** `id`, `conversationId`, `role`, `content`, `generationId`, `videoGenId`, `createdAt`, `conversation`

### `KieTask`

- **Fields (14):** `id`, `taskId`, `provider`, `entityType`, `entityId`, `step`, `status`, `outputUrl`, `errorMessage`, `payload`, `userId`, `createdAt`, `updatedAt`, `completedAt`

### `LanderNewConfig`

- **Fields (5):** `id`, `published`, `draft`, `createdAt`, `updatedAt`

### `LoggedReferralSignupDraft`

- **Fields (10):** `id`, `referralCode`, `referrerUserId`, `ipAddress`, `deviceFingerprint`, `userAgent`, `signup`, `signedUpUserId`, `matchedAt`, `createdAt`

### `LoraTrainingImage`

- **Fields (14):** `id`, `modelId`, `imageUrl`, `imageType`, `imageIndex`, `status`, `prompt`, `errorMsg`, `createdAt`, `updatedAt`, `generationId`, `loraId`, `lora`, `model`

### `ModelVoice`

- **Fields (21):** `id`, `userId`, `modelId`, `provider`, `elevenLabsVoiceId`, `type`, `name`, `description`, `language`, `gender`, `previewUrl`, `sampleAudioUrl`, `isDefault`, `voiceMonthlyLastBilledAt`, `voiceBillingStatus`, `voiceBillingGraceEndsAt`, `createdAt`, `updatedAt`, `user`, `model`, `generatedAudios`

### `NsfwAutoSelectJob`

- **Fields (11):** `id`, `userId`, `modelId`, `description`, `status`, `selections`, `errorMessage`, `createdAt`, `updatedAt`, `completedAt`, `user`

### `NsfwPlanGenerationJob`

- **Fields (12):** `id`, `userId`, `modelId`, `userRequest`, `status`, `selections`, `prompt`, `errorMessage`, `createdAt`, `updatedAt`, `completedAt`, `user`

### `Reel`

- **Fields (28):** `id`, `profileId`, `instagramReelId`, `reelUrl`, `thumbnailUrl`, `views`, `likes`, `comments`, `shares`, `caption`, `audioName`, `postedAt`, `viralScore`, `viewsToAvgRatio`, `lastScoreUpdate`, `createdAt`, `videoUrl`, `contentCategory`, `prevViews`, `prevViewsAt`, `viewsPerHour`, `audioTrendBonus`, `lastScrapedAt`, `momentumMultiplier`, `scrapeTier`, `shareBonus`, `viewsPerHourPrev`, `profile`

### `ReelFinderProfile`

- **Fields (12):** `id`, `username`, `instagramUrl`, `isActive`, `followerCount`, `avgViews`, `avgViewsUpdatedAt`, `addedAt`, `lastScrapedAt`, `scrapeCount`, `scrapeGroup`, `reels`

### `ReferralCommission`

- **Fields (10):** `id`, `referrerUserId`, `referredUserId`, `purchaseAmountCents`, `commissionCents`, `sourceType`, `sourceId`, `createdAt`, `referredUser`, `referrerUser`

### `ReferralPayoutRequest`

- **Fields (10):** `id`, `userId`, `amountCents`, `walletAddress`, `status`, `processedByAdminId`, `adminNote`, `requestedAt`, `processedAt`, `user`

### `RepurposeJob`

- **Fields (9):** `id`, `userId`, `copies`, `status`, `progress`, `message`, `errorMessage`, `createdAt`, `outputs`

### `RepurposeOutput`

- **Fields (7):** `id`, `jobId`, `fileName`, `fileUrl`, `fileSize`, `createdAt`, `job`

### `SavedModel`

- **Fields (40):** `id`, `userId`, `name`, `photo1Url`, `photo2Url`, `photo3Url`, `thumbnail`, `createdAt`, `updatedAt`, `status`, `isAIGenerated`, `aiGenerationParams`, `loraStatus`, `loraUrl`, `loraTriggerWord`, `loraTrainedAt`, `loraFalRequestId`, `loraError`, `nsfwUnlocked`, `looksUnlockedByAdmin`, `faceReferenceUrl`, `nsfwOverride`, `loraSessionPaid`, `activeLoraId`, `age`, `savedAppearance`, `paymentIntentId`, `elevenLabsVoiceId`, `elevenLabsVoiceType`, `elevenLabsVoiceName`, `modelVoicePreviewUrl`, `legacyVoiceMonthlyLastBilledAt`, `legacyVoiceBillingSuspended`, `generations`, `modelVoices`, `generatedVoiceAudios`, `trainingImages`, `user`, `trainedLoras`, `avatars`

### `ScrapeLog`

- **Fields (6):** `id`, `status`, `profilesScraped`, `reelsFound`, `startedAt`, `finishedAt`

### `SextingScript`

- **Fields (16):** `id`, `userId`, `slug`, `name`, `description`, `isBuiltIn`, `isPublic`, `picCount`, `creditsPerPic`, `sceneDescriptions`, `basePrompts`, `themeHint`, `createdAt`, `updatedAt`, `user`, `runs`

### `SextingScriptRun`

- **Fields (14):** `id`, `scriptId`, `userId`, `modelId`, `outfit`, `environment`, `generationIds`, `status`, `creditsSpent`, `errorMessage`, `createdAt`, `completedAt`, `script`, `user`

### `SignupFingerprint`

- **Fields (7):** `id`, `ipAddress`, `deviceFingerprint`, `userAgent`, `email`, `freeCreditsGiven`, `createdAt`

### `StripeWebhookEvent`

- **Fields (4):** `id`, `account`, `type`, `receivedAt`

### `SystemHealthMetric`

- **Fields (10):** `id`, `processUptimeSec`, `memoryRssMb`, `memoryHeapUsedMb`, `memoryHeapTotalMb`, `eventLoopLagMs`, `loadAvg1`, `activeHandles`, `activeRequests`, `createdAt`

### `TelegramLegacyState`

- **Fields (12):** `id`, `chatId`, `mode`, `sessionUserId`, `sessionEmail`, `flow`, `flowUpdatedAt`, `lastBotMessageIds`, `createdAt`, `updatedAt`, `expiresAt`, `sessionUser`

### `TelemetryEdgeEvent`

- **Fields (10):** `id`, `eventType`, `severity`, `message`, `routePath`, `statusCode`, `userId`, `ipHash`, `detailsJson`, `createdAt`

### `TrainedLora`

- **Fields (17):** `id`, `modelId`, `name`, `status`, `loraUrl`, `triggerWord`, `trainedAt`, `falRequestId`, `error`, `faceReferenceUrl`, `createdAt`, `updatedAt`, `defaultAppearance`, `trainingMode`, `category`, `trainingImages`, `model`

### `TutorialSlotVideo`

- **Fields (4):** `slotKey`, `videoUrl`, `createdAt`, `updatedAt`

### `User`

- **Fields (82):** `id`, `email`, `password`, `name`, `role`, `isVerified`, `verificationCode`, `codeExpiresAt`, `subscriptionTier`, `subscriptionStatus`, `subscriptionBillingCycle`, `stripeCustomerId`, `stripeSubscriptionId`, `stripeAccount`, `legacyStripeCustomerId`, `legacyStripeSubscriptionId`, `maxModels`, `subscriptionCredits`, `purchasedCredits`, `creditsExpireAt`, `credits`, `totalCreditsUsed`, `imageCredits`, `videoCredits`, `imagesUsed`, `videosUsed`, `createdAt`, `updatedAt`, `twoFactorEnabled`, `twoFactorSecret`, `freeTrialGenerationId`, `hasUsedFreeTrial`, `onboardingCompleted`, `specialOfferEligible`, `specialOfferLockedAt`, `authProvider`, `googleId`, `telegram_id`, `telegram_username`, `is_telegram`, `freeVideosCompleted`, `affiliateBlocked`, `referralAdvanced`, `firstSaleAt`, `firstSaleEventType`, `allowCustomLoraTrainingPhotos`, `referralCode`, `referredByUserId`, `resetCode`, `resetCodeExpiresAt`, `premiumFeaturesUnlocked`, `region`, `marketingLanguage`, `subscriptionCancelledAt`, `proAccess`, `banLocked`, `affiliateAttribution`, `affiliateConversions`, `creditTransactions`, `cryptoPayments`, `draftTasks`, `generations`, `referredCommissions`, `referralCommissions`, `referralPayoutRequests`, `savedModels`, `modelVoices`, `generatedVoiceAudios`, `avatars`, `avatarVideos`, `telegramLegacyStates`, `referredBy`, `referrals`, `nsfwAutoSelectJobs`, `nsfwPlanGenerationJobs`, `apiKeys`, `abandonedSignupEmailOffer`, `gptxConversations`, `flows`, `flowRuns`, `sextingScripts`, `sextingScriptRuns`

### `VoicePlatformConfig`

- **Fields (4):** `id`, `maxCustomElevenLabsVoices`, `createdAt`, `updatedAt`

### `WithdrawalRequest`

- **Fields (11):** `id`, `affiliateId`, `amountUsd`, `cryptoChain`, `cryptoAddress`, `status`, `txHash`, `adminNote`, `createdAt`, `updatedAt`, `affiliate`

