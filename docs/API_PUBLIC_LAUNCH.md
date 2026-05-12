# Public API launch checklist

_ModelClone ships an HTTP API keyed for integrations (`ApiKey`, prefix `mcl_`) alongside the browser session cookie API. This doc defines what we publish to external developers._

## Shipped artifacts (v1)

| Artifact | Location |
|---------|----------|
| HTTP routes | **Facade:** `GET /health`, `GET /openapi.yaml`, `GET /me` (`src/routes/api-v1.public.routes.js`). **Full parity:** the same **`express.Router`** as `/api/*` is also mounted at **`/api/v1`** (same DB, credits, middleware). **`/api/v1/img2img`**, **`gptx`**, **`viral-reels`**, **`video-repurpose`**, **`support`**, Telegram auth mount under **`/api/v1/...`** like production `/api`. **Excluded:** **`/api/flows/*`** (Flow Studio — not mirrored). |
| Keys for users | **Settings → API** creates keys (`Starter`+ subscription, `trialing` counts): `POST/GET /api/user/api-keys`, etc. Same routes under **`/api/v1/user/api-keys`** with `Bearer mcl_*`. Shared rule: **`shared/apiKeyEligibility.js`**. |
| OpenAPI (partner slice — expand continuously) | **`docs/openapi/v1.openapi.yaml`** → **`GET /api/v1/openapi.yaml`** |
| Canonical narrative | **`docs/API_REFERENCE.md`**, **`docs/API_GENERATION_UX_PARITY.md`**, changelog **`docs/API_CHANGELOG.md`** |

Production must ship **`docs/openapi/v1.openapi.yaml`** or set **`PUBLIC_OPENAPI_PATH`** — otherwise **`GET /api/v1/openapi.yaml`** returns **503** (`openapi_unavailable`).

Global **`/api` AND `/api/v1`** rate limiting skips public contract endpoints (`**/v1/health`**, **`**/v1/openapi.yaml`** on the `/api/v1` mount; legacy skips on `/api` for nested paths if used). **`generationSafetyMiddleware`** runs on **`/api` and `/api/v1`**.

## Artifacts we will maintain

1. **`openapi.json`** (or `openapi.yaml`) at repo root or **`docs/`** — **authoritative contract** for:
   - Base URL / environments
   - Auth schemes: **API key header** (`X-Api-Key` or `Authorization: Bearer mcl_…`) and optional CORS allowlist per key (see `auth.middleware.js`)
   - Request/response shapes, error envelopes, pagination, idempotency

2. **Changelog** — **`docs/API_CHANGELOG.md`** is **mandatory** for integration-affecting edits; run **`npm run verify:api-changelog`** (see **`docs/API_REFERENCE.md`**).

## Scope for v1 documentation

Only routes intended for third parties belong in OpenAPI (omit internal admin routes unless explicitly partner-facing; webhooks documented separately).

Suggested policy:

- Namespace public routes under **`/api/v1/...`** when stabilizing (gradual migrate from today's flat **`/api/...`**).
- Mark internal-only endpoints **private** in code comments and omit from OpenAPI.

## Credits & billing semantics

External clients must obey the same **`deductCredits`** ordering and stable error **`code`** fields. Document those in OpenAPI alongside **`AGENTS.md`** §8.

## Drift prevention

OpenAPI MUST be regenerated or edited **in the same PR** as any change to a **published** endpoint. **`npm run docs:registry`** provides **HTTP_ROUTES** + **`API_GENERATION_CATALOG`**; OpenAPI is expanded incrementally for partners.
