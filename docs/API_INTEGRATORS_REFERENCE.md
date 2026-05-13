# Integrator handbook — REST API (pipelines & automation)

This guide is for **shipping pipelines** against Modelclone (API keys or browser sessions): auth, uploads, synchronous responses, polling, and **`integrationCallbackUrl`** completion deliveries.

Companion artifacts:

| Artifact | Purpose |
|---------|---------|
| **`docs/API_REFERENCE.md`** | Index — OpenAPI regeneration, changelog, env knobs |
| **`docs/openapi/client-api.openapi.yaml`** | Full catalog (`npm run openapi:client`; served under **`GET …/docs/client-api.openapi.yaml`**) |
| **`docs/generated/API_GENERATION_CATALOG.md`** | Auto route listing (`npm run docs:registry`) |
| **`docs/API_GENERATION_UX_PARITY.md`** | ModelClone-X / parity notes |

Canonical HTTP surface:

- Prefer **`https://modelclone.app/api/v1/...`** (integrations).
- SPA and legacy callers also use **`/api/...`** (same handlers; OpenAPI mirrors legacy paths as **`deprecated`** when **`/api/v1/...`** exists).
- Flow Studio (**`/api/flows/...`**) has **no** **`/api/v1/flows`** mirror; flow nodes that create **`Generation`** rows do not yet thread **`integrationCallbackUrl`** from arbitrary flow JSON unless you fork the runners.

---

## 1. Authentication

**API key**

- Headers: **`X-Api-Key: mcl_…`** or **`Authorization: Bearer mcl_…`**.
- Plan/eligibility gates apply (**`API_KEY_REQUIRES_PAID_PLAN`** semantics in product config).

**Browser / session**

- `POST /api/auth/login` (or signup flow) establishes cookies; subsequent requests use **`credentials: 'include'`** on `fetch`.

**Admin JSON**

- Requires an **admin user session**. API-key-only requests are rejected for admin routes (**`ADMIN_SESSION_ONLY`**).

---

## 2. Uploading inputs (three patterns)

### 2.1 Multipart (**small / simple**)

```http
POST /api/upload
Authorization: Bearer mcl_live_xxxxxxxx
Content-Type: multipart/form-data; boundary=----abc

------abc
Content-Disposition: form-data; name="file"; filename="frame.jpg"
Content-Type: image/jpeg

<binary jpeg bytes>
------abc--
```

Success envelope (shape may include `success: true`): JSON with a durable **`url`** you pass into generation bodies (`inputImageUrl`, `targetImage`, etc.).

### 2.2 Vercel Blob token (**large / SSR-friendly**)

1. **`POST /api/upload/blob`** — JSON body negotiated through `@vercel/blob` **`handleUpload`** (see route implementation and OpenAPI operation). Authenticated callers receive a client upload capability; uploads go **browser → Blob**, not through our API bodies.
2. Completion / bookkeeping uses **`blob.upload-completed`** in the JSON **`POST`** envelope (this is **inbound** to Modelclone — *not* the integrator webhook described below).

### 2.3 Presigned R2 (**legacy**)

When Blob-only mode is **off** and R2 is configured:

```http
POST /api/upload/presign
Content-Type: application/json

{ "contentType": "image/jpeg", "folder": "uploads" }
```

Returns **`uploadUrl`** + **`publicUrl`**. Prefer Blob when deploying on Vercel so downstream AI providers can fetch reliably.

---

## 3. Async jobs — IDs, polling, statuses

Nearly every generator returns one or more **`generationId`** values early; work continues on workers / callbacks.

Poll until terminal state:

```http
GET /api/v1/generations/{generationId}
X-Api-Key: mcl_live_xxxxxxxx
```

**`status`** values you will see include at least **`pending`**, **`queued`**, **`processing`**, **`completed`**, **`failed`**.

On **`completed`**, read **`outputUrl`** (sometimes JSON-encoded when multi-image bundles are returned).

On **`failed`**, read **`errorMessage`** / refund-related fields via standard JSON on the generation row.

---

## 4. Integrator completion webhook (`integrationCallbackUrl`)

### 4.1 Request fields (generation `POST` bodies)

Set **exactly one** HTTPS URL via any of:

| Body field | Notes |
|-----------|-------|
| **`integrationCallbackUrl`** | **Recommended.** |
| **`webhookUrl`** | Accepted alias. |
| **`integratorWebhookUrl`** | Accepted alias. |
| **`integratorCallbackUrl`** | Accepted alias. |

Optional HMAC secret (any one of **`integratorWebhookSecret`**, **`callbackSecret`**, **`webhookSecret`**). Maximum length **`256`** characters.

**Rejected / ignored names**

- **`callbackUrl`** is **ignored** for this feature so it cannot collide with **provider** payloads (e.g. Creator Studio **`callBackUrl`** for Veo). Use **`integrationCallbackUrl`**.

HTTPS is required (`https:`). **`http:`** is allowed only for **`localhost`**, **`127.0.0.1`**, **`[::1]`**, or **`*.localhost`**.

Malformed URLs or bad secrets produce **`400`** on matching routes (validated early for generation namespaces such as **`/api/generate/...`**, **`/api/nsfw/...`**, **`/img2img/…`**, etc.).

### 4.2 Delivery semantics

When a **`Generation`** row becomes **`completed`** or **`failed`**, Modelclone claims the row once and **`POST`**s JSON:

```json
{
  "event": "generation.completed",
  "generationId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "userId": "user-uuid",
  "modelId": "optional-model-uuid-or-null",
  "type": "nsfw",
  "status": "completed",
  "outputUrl": "https://cdn.example/output.png",
  "errorMessage": null,
  "prompt": "…",
  "creditsCost": 42,
  "replicateModel": "comfyui-nsfw",
  "providerTaskId": "upstream-task-if-any-or-null",
  "createdAt": "2026-05-12T10:15:31.012Z",
  "completedAt": "2026-05-12T10:17:58.903Z"
}
```

For failures, **`event`** becomes **`generation.failed`** and **`status`** is **`failed`** (with **`outputUrl`** usually **`null`**).

Headers:

| Header | Meaning |
|--------|---------|
| **`Content-Type`** | **`application/json`** |
| **`User-Agent`** | **`Modelclone-Integrator-Webhook/1.0`** |
| **`X-Modelclone-Signature`** | Present when a secret was stored: **`sha256=`** + lowercase hex (**`HMAC-SHA256(secret, rawBodyUtf8)`**). |

Timeouts & retries:

- Roughly **`20 seconds`** HTTP timeout client-side.

- **No automatic retries** once the attempt is acknowledged server-side — design your consumer **idempotent** (upsert by **`generationId` + `status`**), but still poll **`GET /generations/:id`** for reconciliation.

Multiple outputs / fan-out:

- Endpoints that return **arrays** of **`generationIds`** (**quantities**, script packs, etc.) allocate **one** Modelclone webhook **per Generation row**. If you need a single aggregator callback per logical job, use your own dispatcher keyed by **`userId`** + timestamp, or correlate via your DB.

### 4.3 Example — NSFW generation + webhook

```http
POST /api/v1/nsfw/generate
X-Api-Key: mcl_live_xxxxxxxx
Content-Type: application/json
Idempotency-Key: 7eefc1aa-...

{
  "modelId": "…",
  "prompt": "…",
  "integrationCallbackUrl": "https://your.service/hooks/modelclone/nsfw-complete",
  "integratorWebhookSecret": "please-use-a-strong-random-string"
}
```

Your handler verifies **`X-Modelclone-Signature`**, persists the payload, confirms **`200`** within the timeout budget.

---

## 5. Call families (where to read exact schemas)

Everything below is enumerated with request/response bodies in **`client-api.openapi.yaml`**. Listed here as a **mental map**:

| Prefix / area | Typical purpose |
|----------------|----------------|
| **`POST /api/v1/generate/*`** | “Safe” SPA workflow generators (identity, recreate, face swap, prompts, upscale, SynthID remover, Creator Studio uploads, motion, prompt-video …). |
| **`POST /api/v1/nsfw/*`** | NSFW image/video/motion/extension flows gated by trained LoRA + policy. |
| **`POST /api/v1/img2img/*`** | Two-stage comfy / Runpod img2img helpers (describe → generate). |
| **`POST /api/v1/modelclone-x/*`** | Modelclone-X distilled generator + statuses. |
| **`POST /api/v1/upscale`** / **`/synthid-remove`** | Utility RunPod wrappers (also surfaced outside **`/generate`** for historical reasons — see YAML). |
| **`POST /api/v1/onboarding/trial-generate`** | Free trial onboarding portraiture (**`Generation`** **`isTrial`**). |
| **`POST /api/v1/upload*`** | Input hosting (multipart, Blob token, presign). |

**Creator Studio Video** payloads may expose **`callBackUrl`** (**provider** propagation). Pair that field with **`integrationCallbackUrl`** (Modelclone outbound) separately.

---

## 6. Operational checklist for integrators

1. Issue **`mcl_`** key + confirm paid eligibility.
2. Choose upload strategy (multipart vs Blob vs presign).
3. Call generator with URLs + **`integrationCallbackUrl`** + optional secret.
4. Handle **`POST`** notifications + reconcile with **`GET /generations/:id`**.
5. Persist **`generationId`** ↔ your job row for idempotency.
6. Respect global + generation burst rate limits (**`GENERATION_RATE_LIMIT_*`**, **`GENERATION_MAX_IN_FLIGHT_PER_USER`**, **`API_RATE_LIMIT_*`** documented in **`API_REFERENCE.md`**).

---

## 7. Changelog obligation

Whenever you fork integration routes or change webhook semantics:

- **`docs/API_CHANGELOG.md`** — **`[Unreleased]`** entry (**`npm run verify:api-changelog`** gate).
- Regenerate **`docs/openapi/client-api.openapi.yaml`** (**`npm run openapi:client`**) whenever OpenAPI scaffolding text changes materially.
