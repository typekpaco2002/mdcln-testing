# API reference (integration)

_ModelClone integrations use **`/api/v1`** with **`X-Api-Key`** or **`Authorization: Bearer mcl_…`**. It mirrors **`/api`** (same handlers, credits, DB). Flow Studio (**`/api/flows`**) has **no `/api/v1/flows` mirror**._

## Read order

1. **`docs/API_PUBLIC_LAUNCH.md`** — mounts, prod OpenAPI wiring.
2. **`docs/API_CHANGELOG.md`** — **required** whenever integration routes or semantics change (**`npm run verify:api-changelog`**).
3. **`docs/generated/API_GENERATION_CATALOG.md`** — auto route table (**`npm run docs:registry`**).
4. **`docs/API_GENERATION_UX_PARITY.md`** — ModelClone-X / enhance ↔ JSON bodies.
5. **`docs/openapi/v1.openapi.yaml`** — YAML served at **`GET /api/v1/openapi.yaml`** (partner-facing slice).

## Blocking checks

Full SPA + integration surface (literal route scan):

- **Spec file:** **`docs/openapi/client-api.openapi.yaml`**
- **Regenerate:** `npm run openapi:client`
- **Live URL:** **`https://modelclone.app/api/docs/client-api.openapi.yaml`** (production; rate-limit skipped for GitBook / imports)
- **Override path:** **`PUBLIC_CLIENT_OPENAPI_PATH`** (absolute YAML on hosts that do not bundle `docs/openapi/`)

```bash
npm run docs:registry
npm run openapi:client
npm run verify:api-changelog
```

Set **`SKIP_API_CHANGELOG_VERIFY=1`** to bypass the changelog diff check locally.

## Environment (autoscaled backends)

| Variable | Role |
|----------|------|
| `PUBLIC_OPENAPI_PATH` | Optional absolute YAML when `docs/openapi/` isn’t bundled |
| `PUBLIC_CLIENT_OPENAPI_PATH` | Optional absolute path for **`client-api.openapi.yaml`** (SPA + integrations catalog) |
| `GENERATION_RATE_LIMIT_MAX` | Per-user generation bursts/min (**Upstash**/Redis when configured) |
| `GENERATION_MAX_IN_FLIGHT_PER_USER` | Max concurrent non-terminal **`Generation`** rows (**`0`** = off) |
| `API_RATE_LIMIT_MAX`, `API_RATE_LIMIT_WINDOW_MS` | Global `/api` + `/api/v1` IP throttle |

Redis / Upstash (see **`src/middleware/rateLimiter.js`**) aligns limits across instances (e.g. Vercel).

## Security notes

- **Admin** **`/admin/*`**: **`admin` role AND not `mcl_` auth** (**`ADMIN_SESSION_ONLY`**).
- CORS **`corsOrigins`** per API key restricts browser callers.

## Deploy smoke (staging)

Exercise **`GET /api/v1/openapi.yaml`**, **`GET /api/v1/health`**, one authenticated generation round-trip + poll **`GET /api/v1/generations/:id`**, and merge an **`docs/API_CHANGELOG.md`** entry for anything new.
