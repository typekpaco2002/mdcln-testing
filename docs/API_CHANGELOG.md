# Changelog — HTTP API (/api & /api/v1)

All notable **integration-facing** HTTP changes MUST be logged here whenever `src/routes/**`, generation middleware (`src/middleware/generation*.js`, `generation-safety.middleware.js`), **`docs/openapi/**`**, or auth rules that affect **`mcl_*` keys** change.

Format follows [Keep a Changelog](https://keepachangelog.com/). Bump **Unreleased** during development; rename to **`[YYYY-MM-DD]`** when you cut a release.

---

## [Unreleased]

### Added

- **Integrator completion webhooks:** optional **`integrationCallbackUrl`** (aliases **`webhookUrl`**, **`integratorWebhookUrl`**, **`integratorCallbackUrl`**) + optional HMAC (**`integratorWebhookSecret`** / **`callbackSecret`** / **`webhookSecret`**) persisted on **`Generation`**; **`POST`** delivery once on **`completed` | `failed`** with **`X-Modelclone-Signature`** when configured. Bare **`callbackUrl`** is **ignored** here to avoid clashes with Creator Studio provider **`callBackUrl`**. Prisma migration **`20260512120000_integrator_webhook_fields`**. See **`docs/API_INTEGRATORS_REFERENCE.md`**.
- **Express** rejects malformed integrator webhook fields early on generation namespaces (**`generate`**, **`nsfw`**, **`img2img`**, **`modelclone-x`**, **`gptx`**, **`sexting-scripts`**, **`onboarding`**).
- **Full client-facing OpenAPI 3**: **`docs/openapi/client-api.openapi.yaml`** (regenerate **`npm run openapi:client`**), served at **`GET https://modelclone.app/api/docs/client-api.openapi.yaml`** (mirror: **`GET /api/v1/docs/client-api.openapi.yaml`**). **`PUBLIC_CLIENT_OPENAPI_PATH`** overrides the file location on disk.
- **`docs/API_REFERENCE.md`** index and **`docs/API_GENERATION_UX_PARITY.md`** for ModelClone-X / enhance parity.
- **Auto catalog** **`docs/generated/API_GENERATION_CATALOG.md`** (`npm run docs:registry`).
- **Admin routes**: **`authViaApiKey` requests rejected** with **`ADMIN_SESSION_ONLY`** (session JWT only).

### Changed

- **`generationConcurrencyMiddleware`** (**`GENERATION_MAX_IN_FLIGHT_PER_USER`**): default ceiling **`12 → 48`**; **`queued`** staging rows no longer count toward the cap — fixes **nudes-pack** (~26 poses) and similar batch flows tripping the limit while prompts stage before RunPod.
- **OpenAPI client spec** (`docs/openapi/client-api.openapi.yaml`; regenerate **`npm run openapi:client`**): **Round 2** — human **`summary`/`description`** (JSDoc, optional **`docs/openapi/overrides`** markdown files keyed as **`VERB__path__segments`** without braces, synthesized fallbacks); traceability **`x-modelclone-generated-from`**; mined **`express-validator`** **`body`**/**`query`** where practical; multipart fields inferred from **`multer.*`**; **`Paginated`** + typed **`200`** payloads via Tier‑1 route map in **`scripts/generate-client-openapi.mjs`**; legacy **`/api/...`** routes kept beside **`/api/v1/...`** with **`deprecated: true`** (Flows **`/api/flows`** unchanged); **`servers`** trimmed to production only (**`info.description`** notes staging issuance via support contact); **`info.description`** documents optional integrator completion **`POST`** to **`integrationCallbackUrl`** (distinct from Blob **`blob.upload-completed`** inbound JSON); tightened Spectral + custom non‑empty **`operation.summary`** rule; inlined arbitrary JSON envelopes (**`AnyJsonPayload`** schema removed); retired unused stubs (**`LoraTrainingAsset`**, **`CreditBalanceProjection`**, **`HealthQueueExample`**). **Round 1** recap: **`{parameters}`** on templates; verb‑scoped statuses; **`Idempotency-Key`** on writes; **`RateLimited429`** header names + **`SuccessOk`** scaffold; **`info.contact`** support fields.
- **Throttle defaults** unchanged — tune via **`GENERATION_RATE_LIMIT_MAX`**, **`API_RATE_LIMIT_MAX`**, **`API_RATE_LIMIT_WINDOW_MS`** (`src/middleware/rateLimiter.js`).

### Removed

- Experimental MCP wrapper (**`integrations/mcp-modelclone`**); call HTTP **`/api/v1`** directly.

---

## Guidance

| Change type | Section | Also update |
|-------------|---------|--------------|
| New route / field | Added | **`docs/openapi/v1.openapi.yaml`** when partner-visible; **`npm run docs:registry`** |
| Breaking status / semantics | Changed | **`API_GENERATION_UX_PARITY.md`** if SPA contract changed |
