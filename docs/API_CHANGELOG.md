# Changelog — HTTP API (/api & /api/v1)

All notable **integration-facing** HTTP changes MUST be logged here whenever `src/routes/**`, generation middleware (`src/middleware/generation*.js`, `generation-safety.middleware.js`), **`docs/openapi/**`**, or auth rules that affect **`mcl_*` keys** change.

Format follows [Keep a Changelog](https://keepachangelog.com/). Bump **Unreleased** during development; rename to **`[YYYY-MM-DD]`** when you cut a release.

---

## [Unreleased]

### Added

- **`docs/API_REFERENCE.md`** index and **`docs/API_GENERATION_UX_PARITY.md`** for ModelClone-X / enhance parity.
- **Auto catalog** **`docs/generated/API_GENERATION_CATALOG.md`** (`npm run docs:registry`).
- **`generationConcurrencyMiddleware`**: caps non-terminal **`Generation`** rows per user (**`GENERATION_MAX_IN_FLIGHT_PER_USER`**, default `12`; set **`0`** to disable).
- **Admin routes**: **`authViaApiKey` requests rejected** with **`ADMIN_SESSION_ONLY`** (session JWT only).

### Changed

- **Throttle defaults** unchanged — tune via **`GENERATION_RATE_LIMIT_MAX`**, **`API_RATE_LIMIT_MAX`**, **`API_RATE_LIMIT_WINDOW_MS`** (`src/middleware/rateLimiter.js`).

### Removed

- Experimental MCP wrapper (**`integrations/mcp-modelclone`**); call HTTP **`/api/v1`** directly.

---

## Guidance

| Change type | Section | Also update |
|-------------|---------|--------------|
| New route / field | Added | **`docs/openapi/v1.openapi.yaml`** when partner-visible; **`npm run docs:registry`** |
| Breaking status / semantics | Changed | **`API_GENERATION_UX_PARITY.md`** if SPA contract changed |
