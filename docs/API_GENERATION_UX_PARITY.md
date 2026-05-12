# Generation UX ↔ JSON (API parity)

The SPA and **`/api` / `/api/v1`** use the **same route handlers**. Recreate UX by sending identical JSON bodies (see **`src/routes/api.routes.js`** JSDoc above each `router.post`).

## Ai prompt enhance

**Endpoint:** **`POST /generate/enhance-prompt`**

| Field | Meaning |
|-------|---------|
| `prompt` | Draft text |
| `mode` | `"casual"` \| `"nsfw"` \| `"ultra-realism"` (affects credit cost) |
| `modelLooks` | Optional Nano Banana shaping object |

Runs **explicitly when the UI runs “Enhance”** — it is **not** auto-fired by ModelClone-X when `preOptimized` / `useCustomPrompt` dictate otherwise.

## ModelClone-X — `POST /modelclone-x/generate`

| UX | JSON |
|----|------|
| “Final prompt already optimized (after Grok/from-image)” | **`preOptimized: true`** (`skipSecondOptimizer` server-side — skips second optimizer pass) |
| “Exact wording — no optimizer” | **`useCustomPrompt: true`** (txt routes; mutually exclusive semantics with skipping optimizer path) |
| “Use reference photo / img2img” | **`modelcloneXImg2Img: true`** **required** if **`inputImageUrl`** / **`inputImageBase64`** set |
| Denoise strength | **`img2imgDenoise`** (default **`0.6`**) |

**Prep:** **`POST /modelclone-x/prompt-from-image`** → take **`optimizedPrompt`** into **`prompt`** plus **`preOptimized: true`** to match guided UI flows.

**Discovery:** **`GET /modelclone-x/config`** exposes pricing knobs and **`limits`**.

## SFW main pipeline routes

`/generate/image-identity`, `/generate/video-motion`, `/generate/advanced`, `/generate/video-prompt`, `/generate/face-swap`, Creator Studio subtree, Talking Head → see **inline docs** immediately above declarations in **`api.routes.js`** (validated by **`validateGeneration`** where listed).

## NSFW

`/nsfw/generate`, `/nsfw/generate-advanced`, video/motion/script routes — parity with SPA; grep **`NSFWPage`** / **`components`** callers for exhaustive field parity when in doubt.

## Img2Img satellite

**`/api/v1/img2img/generate`** — header comment lists **`inputImageUrl`**, **`loraUrl`**, **`triggerWord`**, optional **`lookDescription`**, **`loraStrength`**, **`denoise`**, **`seed`**.
