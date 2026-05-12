# Changelog — HTTP API (/api & /api/v1)

All notable **integration-facing** HTTP changes MUST be logged here whenever `src/routes/**`, generation middleware (`src/middleware/generation*.js`, `generation-safety.middleware.js`), **`docs/openapi/**`**, or auth rules that affect **`mcl_*` keys** change.

Format follows [Keep a Changelog](https://keepachangelog.com/). Bump **Unreleased** during development; rename to **`[YYYY-MM-DD]`** when you cut a release.

---

## [Unreleased]

### Added

- **Full client-facing OpenAPI 3**: **`docs/openapi/client-api.openapi.yaml`** (regenerate **`npm run openapi:client`**), served at **`GET https://modelclone.app/api/docs/client-api.openapi.yaml`** (mirror: **`GET /api/v1/docs/client-api.openapi.yaml`**). **`PUBLIC_CLIENT_OPENAPI_PATH`** overrides the file location on disk.
- **`docs/API_REFERENCE.md`** index and **`docs/API_GENERATION_UX_PARITY.md`** for ModelClone-X / enhance parity.
- **Auto catalog** **`docs/generated/API_GENERATION_CATALOG.md`** (`npm run docs:registry`).
- **`generationConcurrencyMiddleware`**: caps non-terminal **`Generation`** rows per user (**`GENERATION_MAX_IN_FLIGHT_PER_USER`**, default `12`; set **`0`** to disable).
- **Admin routes**: **`authViaApiKey` requests rejected** with **`ADMIN_SESSION_ONLY`** (session JWT only).

### Changed

- **OpenAPI client spec** (`docs/openapi/client-api.openapi.yaml`; regenerate **`npm run openapi:client`**): **Round 2** — human **`summary`/`description`** (JSDoc, optional **`docs/openapi/overrides`** markdown files keyed as **`VERB__path__segments`** without braces, synthesized fallbacks); traceability **`x-modelclone-generated-from`**; mined **`express-validator`** **`body`**/**`query`** where practical; multipart fields inferred from **`multer.*`**; **`Paginated`** + typed **`200`** payloads via Tier‑1 route map in **`scripts/generate-client-openapi.mjs`**; legacy **`/api/...`** routes kept beside **`/api/v1/...`** with **`deprecated: true`** (Flows **`/api/flows`** unchanged); **`servers`** trimmed to production only (**`info.description`** notes staging issuance via support contact); clarified **no outbound integrator webhooks** vs **`blob.upload-completed`** (**client→Modelclone JSON**, not callbacks to partner servers); tightened Spectral + custom non‑empty **`operation.summary`** rule; inlined arbitrary JSON envelopes (**`AnyJsonPayload`** schema removed); retired unused stubs (**`LoraTrainingAsset`**, **`CreditBalanceProjection`**, **`HealthQueueExample`**). **Round 1** recap: **`{parameters}`** on templates; verb‑scoped statuses; **`Idempotency-Key`** on writes; **`RateLimited429`** header names + **`SuccessOk`** scaffold; **`info.contact`** support fields.
- **Throttle defaults** unchanged — tune via **`GENERATION_RATE_LIMIT_MAX`**, **`API_RATE_LIMIT_MAX`**, **`API_RATE_LIMIT_WINDOW_MS`** (`src/middleware/rateLimiter.js`).

### Removed

- Experimental MCP wrapper (**`integrations/mcp-modelclone`**); call HTTP **`/api/v1`** directly.

---

## Guidance

| Change type | Section | Also update |
|-------------|---------|--------------|
| New route / field | Added | **`docs/openapi/v1.openapi.yaml`** when partner-visible; **`npm run docs:registry`** |
| Breaking status / semantics | Changed | **`API_GENERATION_UX_PARITY.md`** if SPA contract changed |
