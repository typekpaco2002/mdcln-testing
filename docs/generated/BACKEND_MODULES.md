# Generated: Backend module lists

**Generated at:** 2026-05-17T19:23:57.010Z

## Controllers

- `src/controllers/admin.controller.js`
- `src/controllers/auth.controller.js`
- `src/controllers/generation.controller.js`
- `src/controllers/model-voice.controller.js`
- `src/controllers/model.controller.js`
- `src/controllers/nsfw.controller.js`
- `src/controllers/public-api-v1.controller.js`
- `src/controllers/referral.controller.js`
- `src/controllers/sexting-scripts.controller.js`
- `src/controllers/twoFactor.controller.js`

## Services

- `src/services/affiliate-lander.service.js`
- `src/services/backup.service.js`
- `src/services/blob-remirror-queue.service.js`
- `src/services/branding.service.js`
- `src/services/catastrophe-user-restore.service.js`
- `src/services/child-safety-report.service.js`
- `src/services/credit.service.js`
- `src/services/disaster-recovery.service.js`
- `src/services/elevenlabs.service.js`
- `src/services/email.service.js`
- `src/services/fal.service.js`
- `src/services/ffmpeg-worker-client.js`
- `src/services/fingerprint.service.js`
- `src/services/flow-engine.service.js`
- `src/services/flow-node-registry.js`
- `src/services/generation-poller.service.js`
- `src/services/generation-pricing.service.js`
- `src/services/generation-safety-check.service.js`
- `src/services/generation-safety-config.service.js`
- `src/services/heygen.service.js`
- `src/services/img2img.service.js`
- `src/services/kie-lost-generation-reconcile.service.js`
- `src/services/kie-pipeline-continuation.service.js`
- `src/services/kie.service.js`
- `src/services/lander-new-config.service.js`
- `src/services/mcxGrokImagePrompt.service.js`
- `src/services/mcxImageToPrompt.service.js`
- `src/services/media-reformatter.service.js`
- `src/services/modelcloneX.service.js`
- `src/services/nanobanana-prompt.service.js`
- `src/services/nsfw-motion-runpod.service.js`
- `src/services/nsfw-motion.service.js`
- `src/services/nudes-pack-config.service.js`
- `src/services/piapi.service.js`
- `src/services/prompt-template-config.service.js`
- `src/services/provider-balances.service.js`
- `src/services/queue.service.js`
- `src/services/referral.service.js`
- `src/services/repurpose-ai-filters.js`
- `src/services/runninghub.service.js`
- `src/services/signup-winback-email.service.js`
- `src/services/stripe-credit-reconcile.service.js`
- `src/services/stripe-sync-watchdog.service.js`
- `src/services/telegramBot.js`
- `src/services/telemetry.service.js`
- `src/services/tutorial-videos.service.js`
- `src/services/upscaler.service.js`
- `src/services/user-activity-restore.service.js`
- `src/services/vercel-log-deep-dive.service.js`
- `src/services/vercel-log-inventory.service.js`
- `src/services/vercel-runtime-logs-fetch.service.js`
- `src/services/video-generation-pricing.js`
- `src/services/video-repurpose.service.js`
- `src/services/video.service.js`
- `src/services/viral-reels.service.js`
- `src/services/voice-monthly-billing.service.js`
- `src/services/voice-platform.service.js`
- `src/services/wavespeed.service.js`
- `src/services/winback-email-template.service.js`

## Middleware

- `src/middleware/admin.middleware.js`
- `src/middleware/auth.middleware.js`
- `src/middleware/generation-concurrency.middleware.js`
- `src/middleware/generation-safety.middleware.js`
- `src/middleware/rateLimiter.js`
- `src/middleware/telemetry.middleware.js`
- `src/middleware/validation.js`

## Lib (shared server utilities)

- `src/lib/app-public-url.js`
- `src/lib/defaultPrompts/enhancePromptNsfwSystem.js`
- `src/lib/defaultPrompts/img2imgInjectSystemPrompt.js`
- `src/lib/ffmpeg-worker-env.js`
- `src/lib/firebase-admin.js`
- `src/lib/generationUploadGuards.js`
- `src/lib/integrator-generation-webhook.js`
- `src/lib/mirrorRedisCache.js`
- `src/lib/nsfwZit62PromptBuilder.js`
- `src/lib/prisma.js`
- `src/lib/reelscraper-runner.js`
- `src/lib/runpod-image-generation-recovery.js`
- `src/lib/runpod-job-status.js`
- `src/lib/runpodWebhookUrl.js`
- `src/lib/sexting-script-pricing.js`
- `src/lib/stripeClients.js`
- `src/lib/stripeDualResync.js`
- `src/lib/stripeMetadataChunk.js`
- `src/lib/structuredPromptInput.js`
- `src/lib/upstashRateLimitBridge.js`
- `src/lib/userError.js`


## Shared (client + server)

- `shared/apiKeyEligibility.js`
- `shared/loraTrainingTiers.js`
- `shared/nudesPackPoses.js`


## Route files (tree)

- `src/routes/admin-affiliate-lander.routes.js`
- `src/routes/admin-lander-new.routes.js`
- `src/routes/admin.routes.js`
- `src/routes/affiliate-lander-public.routes.js`
- `src/routes/api-v1.public.routes.js`
- `src/routes/api.routes.js`
- `src/routes/auth/telegram.js`
- `src/routes/avatar.routes.js`
- `src/routes/crypto.webhook.js`
- `src/routes/designer-studio.routes.js`
- `src/routes/draft.routes.js`
- `src/routes/fal-callback.routes.js`
- `src/routes/flows.routes.js`
- `src/routes/gptx.routes.js`
- `src/routes/heygen-callback.routes.js`
- `src/routes/img2img.routes.js`
- `src/routes/kie-callback.routes.js`
- `src/routes/lander-new.routes.js`
- `src/routes/nowpayments.routes.js`
- `src/routes/piapi-callback.routes.js`
- `src/routes/referral.routes.js`
- `src/routes/reformatter.routes.js`
- `src/routes/runninghub-callback.routes.js`
- `src/routes/runpod-callback.routes.js`
- `src/routes/stripe.routes.js`
- `src/routes/stripe.webhook.js`
- `src/routes/support.routes.js`
- `src/routes/telegram/legacy/api.js`
- `src/routes/telegram/legacy/auth.js`
- `src/routes/telegram/legacy/config.js`
- `src/routes/telegram/legacy/dashboard.js`
- `src/routes/telegram/legacy/generate.js`
- `src/routes/telegram/legacy/helpers.js`
- `src/routes/telegram/legacy/history.js`
- `src/routes/telegram/legacy/jorgeee-prompts.js`
- `src/routes/telegram/legacy/jorgeee-workflows.js`
- `src/routes/telegram/legacy/keyboards.js`
- `src/routes/telegram/legacy/mcx.js`
- `src/routes/telegram/legacy/media.js`
- `src/routes/telegram/legacy/models.js`
- `src/routes/telegram/legacy/nsfw.js`
- `src/routes/telegram/legacy/referral.js`
- `src/routes/telegram/legacy/repurpose-presets.js`
- `src/routes/telegram/legacy/settings.js`
- `src/routes/telegram/legacy/state.js`
- `src/routes/telegram/legacy/tools.js`
- `src/routes/telegram/legacy/voice.js`
- `src/routes/telegram/webhook.js`
- `src/routes/video-repurpose.routes.js`
- `src/routes/viral-reels.routes.js`
- `src/routes/wavespeed-callback.routes.js`
