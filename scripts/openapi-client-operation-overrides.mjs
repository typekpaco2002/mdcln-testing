/**
 * Curated documentation patches merged into docs/openapi/client-api.openapi.yaml
 * by generate-client-openapi.mjs (keyed by **canonical** path: `/api/...`, never `/api/v1/...`).
 */
export const CLIENT_OPENAPI_OPERATION_OVERRIDES = {
  "/health": {
    get: {
      summary: "Liveness / health probe",
      description:
        "**No auth.** Returns process health; used by uptime monitors and load balancers.",
    },
  },
  "/api/auth/login": {
    post: {
      summary: "Email + password login (session cookie)",
      description:
        "Sets **HttpOnly** session cookies (`validateLogin`). Use **`credentials: 'include'`** on subsequent browser requests.\n\n" +
        "Failures: **`400`** validation, **`401`** bad credentials.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AuthLoginExample" },
            example: {
              email: "user@example.com",
              password: "••••••••",
            },
          },
        },
      },
      responses: {
        "401": {
          description: "Invalid email or password",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PlainErrorBody" },
              example: {
                success: false,
                error: "Invalid email or password",
              },
            },
          },
        },
      },
    },
  },
  "/api/auth/signup": {
    post: {
      summary: "Create account (`validateSignup`)",
      description:
        "**Rate limited.** May require Firebase email verification flow depending on rollout; failures return **`400`** with field errors.\n\n" +
        "See **`src/controllers/auth.controller.js`** + **`validateSignup`** for required fields.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AuthSignupExample" },
            example: {
              email: "new@example.com",
              password: "longRandomSecret123!",
              name: "Display Name",
            },
          },
        },
      },
    },
  },
  "/api/upload/blob": {
    post: {
      security: [],
      summary: "Vercel Blob — token (`handleUpload`) or upload completion",
      description:
        "**Dual JSON contract on one route**\n\n" +
        "1. **`body.type ≠ blob.upload-completed`**: **`authMiddleware`** runs; `@vercel/blob` **`handleUpload`** returns `{ url, pathname, … }` token JSON for client **direct Blob** upload (**no multipart**).\n\n" +
        "2. **`{\"type\":\"blob.upload-completed\", ...}`**: completion callback from **`handleUpload`** (**no Bearer** required).\n\n" +
        "**`400`**: malformed token/handshake (**`handleUpload`** error).\n\n" +
        "Prefer Blob for large payloads — avoids server **`413`** multer/memory limits documented on **`POST /api/upload`**.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              oneOf: [
                { $ref: "#/components/schemas/BlobUploadHandshakeRequest" },
                { $ref: "#/components/schemas/BlobUploadCompletedRequest" },
              ],
            },
          },
        },
      },
      responses: {
        "400": {
          description: "Token / handshake failure",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PlainErrorBody" },
              example: {
                error: "Upload token failed",
              },
            },
          },
        },
      },
    },
  },
  "/api/upload/presign": {
    post: {
      deprecated: true,
      summary: "R2 presigned PUT URL (legacy; disabled in Blob-only mode)",
      description:
        "**`409`** when **`isBlobOnlyStorageMode()`** — use **`POST /api/upload/blob`** instead.\n\n" +
        "**`503`** when R2 is not configured.\n\n" +
        "Body requires **`contentType`**; optional **`folder`** ∈ `uploads | training | support-attachments | generations`.",
      security: [
        { SessionCookieAuth: [] },
        { ApiKeyAuth: [] },
        { BearerAuth: [] },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/PresignRequestExample" },
          },
        },
      },
      responses: {
        "200": {
          description: "Presigned upload + public read URL",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PresignUrlsResponse" },
            },
          },
        },
        "400": {
          description: "`contentType` missing",
          content: {
            "application/json": {
              example: { success: false, error: "contentType required" },
            },
          },
        },
        "409": {
          $ref: "#/components/responses/Conflict409",
        },
        "503": {
          $ref: "#/components/responses/ServiceUnavailable503",
        },
      },
    },
  },
  "/api/upload": {
    post: {
      summary: "Multipart upload — field `file` (memory → Blob or R2)",
      description:
        "**`multipart/form-data`** with field **`file`**. Runs **`validateGenerationUploadFull`** (`generationUploadGuards`) — MIME/size/video duration errors return **`400`**/`413` with **`code` + `solution`**.\n\n" +
        "Empty upload → **`{ success:false, error:\"No file uploaded\" }`** (**`400`**).\n\n" +
        "Multer over limit → **`FILE_TOO_LARGE`** (**`413`**) via global error middleware with **`maxUploadBytes`**.\n\n" +
        "When neither Blob nor R2 is configured → **`503`**.",
      security: [
        { SessionCookieAuth: [] },
        { ApiKeyAuth: [] },
        { BearerAuth: [] },
      ],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["file"],
              properties: {
                file: {
                  type: "string",
                  format: "binary",
                  description: "Image/video buffer validated by guards",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Stored object URL",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UploadUrlResponseExample" },
            },
          },
        },
        "400": {
          $ref: "#/components/responses/UploadRejected400",
        },
        "413": {
          $ref: "#/components/responses/PayloadTooLarge413",
        },
        "503": {
          $ref: "#/components/responses/ServiceUnavailable503",
        },
      },
    },
  },
  "/api/upscale": {
    post: {
      summary: "Submit image upscale (RunPod) — JSON URL or multipart `image`",
      description:
        "**Preferred:** `application/json` **`{ \"inputImageUrl\": \"…\" }`** (already-hosted image; avoids multipart **`413`**).\n\n" +
        "**Alternate:** `multipart/form-data` field **`image`** (≤ **20 MB**, image MIME only).\n\n" +
        "Requires **`authMiddleware`** + credits ≥ dynamic **`upscalerImage`** pricing or **`402`**. **`429`**/`GENERATION_QUEUE_FULL`** via concurrency middleware.\n\n" +
        "Returns **`generationId`** + **`runpodJobId`** — poll **`GET /api/upscale/status/{generationId}`**.",
      security: [
        { SessionCookieAuth: [] },
        { ApiKeyAuth: [] },
        { BearerAuth: [] },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpscaleRequestJson" },
            example: {
              inputImageUrl: "https://example.public.blob.vercel-storage.com/photo.jpg",
            },
          },
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                image: {
                  type: "string",
                  format: "binary",
                  description: "JPEG/PNG/WebP (≤ 20 MB)",
                },
                inputImageUrl: {
                  type: "string",
                  description: "Usually unused when sending binary — prefer JSON-only mode",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Upscale queued",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  generationId: { type: "string" },
                  runpodJobId: { type: "string" },
                },
              },
            },
          },
        },
        "400": {
          description: "Missing image, bad fetch URL, invalid multipart",
          content: {
            "application/json": {
              examples: {
                neither: {
                  value: {
                    success: false,
                    error:
                      "No image provided (expected JSON {inputImageUrl} or multipart 'image' field)",
                  },
                },
              },
            },
          },
        },
        "402": {
          $ref: "#/components/responses/PaymentRequired402",
        },
      },
    },
  },
  "/api/upscale/status/{generationId}": {
    get: {
      summary: "Poll upscale generation status / image URL",
      description:
        "Returns **`completed`**/`failed`** with **`imageUrl`** or provider error summary; may trigger on-demand RunPod poll when webhook is delayed.",
      security: [
        { SessionCookieAuth: [] },
        { ApiKeyAuth: [] },
        { BearerAuth: [] },
      ],
      responses: {
        "404": {
          description: "Foreign or unknown **`generationId`**",
          content: {
            "application/json": {
              example: { success: false, error: "Not found" },
            },
          },
        },
      },
    },
  },
  "/api/stripe/create-checkout-session": {
    post: {
      tags: ["Billing"],
      summary: "Stripe Checkout — subscription session",
      description:
        "**Session JWT only** (not **`mcl_`**‑only admin patterns). Loads user from DB and applies dual‑Stripe‑account routing / referral discount validation (**`referralCode`**).\n\n" +
        "Common failures: **`400`** referral validation messages, **`404`** stale user.",
      security: [{ SessionCookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/StripeCheckoutRequestExample" },
            example: {
              tierId: "pro",
              billingCycle: "monthly",
              referralCode: "friend-slug",
              discountCode: null,
            },
          },
        },
      },
      responses: {
        "200": {
          description:
            "**Success** payloads vary — typically includes Stripe **`url`** (hosted checkout). Inspect client handling in billing UI.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        },
        "404": {
          description: "User missing from DB for JWT subject",
          content: {
            "application/json": {
              example: { error: "User not found" },
            },
          },
        },
      },
    },
  },
  "/api/models/{modelId}/voice/clone": {
    post: {
      summary: "Clone custom voice (multipart `audio`)",
      description:
        "**ElevenLabs** pipeline — multipart field **`audio`**. **`voiceCloneUpload`** filter: **`.mp3` / `audio/mpeg`** only.\n\n" +
        "Subject to **`generationConcurrencyMiddleware`** + credits rate limiting.\n\n" +
        "Errors follow upload guards / voice-controller normalization (**`400`** / **`413`**).",
      security: [
        { SessionCookieAuth: [] },
        { ApiKeyAuth: [] },
        { BearerAuth: [] },
      ],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["audio"],
              properties: {
                audio: {
                  type: "string",
                  format: "binary",
                  description: "MP3 voice sample",
                },
              },
            },
          },
        },
      },
      responses: {
        "400": {
          description: "`INVALID_FILE_TYPE` / missing sample / provider message",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UploadGuardError" },
            },
          },
        },
      },
    },
  },
  "/api/models/{modelId}/voices/clone": {
    post: {
      summary: "Clone voice (`voices/*` sibling route)",
      description: "Same multipart **`audio`** contract as **`/voice/clone`**.",
      security: [
        { SessionCookieAuth: [] },
        { ApiKeyAuth: [] },
        { BearerAuth: [] },
      ],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["audio"],
              properties: {
                audio: { type: "string", format: "binary", description: "MP3 voice sample" },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * @param {string} openapiPath Already `/api/foo/{id}` form
 * @param {string} methodLower get|post|put|patch|delete
 */
export function getClientOpenApiOverride(openapiPath, methodLower) {
  const canon = openapiPath.startsWith("/api/v1/")
    ? `/api/${openapiPath.slice("/api/v1/".length)}`
    : openapiPath;
  return CLIENT_OPENAPI_OPERATION_OVERRIDES[canon]?.[methodLower] ?? null;
}
