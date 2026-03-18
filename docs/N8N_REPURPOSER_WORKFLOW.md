# n8n Video Repurposer – Step-by-Step Build & Implementation Plan

This plan offloads FFmpeg processing from Vercel to n8n so the serverless function stays under 250 MB. The app sends jobs to an n8n webhook; n8n runs FFmpeg and calls back with results.

---

## Part 1: Prerequisites

### 1.1 n8n with FFmpeg

- **Custom image (this repo):** Use **`docker/n8n-ffmpeg/`** to build n8n with FFmpeg: `docker build -t n8n-ffmpeg docker/n8n-ffmpeg`, then run that image instead of `n8nio/n8n`. See `docker/n8n-ffmpeg/README.md`. FFmpeg is installed at build time; use the **Execute Command** node to run the system `ffmpeg` (do **not** use the community node **n8n-nodes-ffmpeg-command** on Alpine — its bundled binaries are glibc-only and fail with `libmvec.so.1` / symbol not found).
- **n8n cloud:** FFmpeg is not installed. Use **n8n self-hosted** (Docker or VM) and install FFmpeg on the host or in the same container.
- **Docker (recommended):** Use an image that has both n8n and FFmpeg, or run n8n in a stack where an “FFmpeg worker” container has FFmpeg and is callable (e.g. over HTTP or from n8n Execute Command pointing to that container).
- **Option A – Same host:** Install FFmpeg on the machine running n8n: `apt install ffmpeg` (Debian/Ubuntu). Then n8n’s **Execute Command** node can run `ffmpeg`.
- **Option B – Separate FFmpeg service:** Run a small API (e.g. on Railway/Render) that accepts video URL + settings and runs your existing Node/FFmpeg logic, returns output URLs. n8n then only does: HTTP Request (trigger) → HTTP Request (call FFmpeg API) → HTTP Request (callback to app). No FFmpeg needed inside n8n.

### 1.2 App environment variables

Add to your app (e.g. Vercel / `.env`):

| Variable | Description |
|----------|-------------|
| `REPURPOSER_MODE` | `n8n` to send jobs to n8n; omit or `local` to run FFmpeg on the app server. |
| `N8N_REPURPOSE_WEBHOOK_URL` | Full URL of the n8n webhook that receives repurpose jobs (e.g. `https://your-n8n.com/webhook/repurpose`). |
| `N8N_CALLBACK_SECRET` | Shared secret the app sends in the payload; n8n sends it back in the callback so the app can verify requests. |

---

## Part 2: App changes (your backend)

### 2.1 Presigned PUT for n8n uploads (R2)

n8n will upload processed files directly to R2 so the app doesn’t handle large bodies.

- **Add** in `src/utils/r2.js` a function that generates a **presigned PUT URL for a fixed key** (e.g. `repurpose/{userId}/{jobId}/{fileName}`).
- **Signature:** e.g. `getR2PresignedPutForKey(key, contentType, expiresInSeconds)`.
- Use `PutObjectCommand` with that `key` and `ContentType`, then `getSignedUrl(..., { expiresIn })`. Return `{ uploadUrl, publicUrl }` where `publicUrl = R2_PUBLIC_URL + '/' + key`.

### 2.2 Callback endpoint for n8n

- **Route:** `POST /api/video-repurpose/n8n-callback` (no auth; validation by secret).
- **Body (JSON):**  
  `{ jobId, status: "completed" | "failed", secret, outputs?: [{ fileName, fileUrl }], error?: string }`
- **Logic:**
  1. If `secret !== process.env.N8N_CALLBACK_SECRET` → `401`.
  2. Load job by `jobId` (from DB or in-memory `jobs`). If not found → `404`.
  3. If `status === "failed"`: set job status to failed, store `error`, persist to DB, return `200`.
  4. If `status === "completed"`: set job status completed, set `job.outputs` from `outputs` (each with `file_name`, `download_url` or `fileUrl`). Persist to DB (e.g. create/update `RepurposeOutput` records with `fileName`, `fileUrl`). Return `200`.
- **Idempotency:** If job is already completed/failed, still return `200` so n8n doesn’t retry.

### 2.3 Generate endpoint: when to use n8n

In the repurpose **generate** flow (e.g. `POST /generate` and URL-based handler):

- After you have: `jobId`, `userId`, source media URL (`videoUrl` from client), `watermarkUrl` (optional), `settings` (including `copies`), `isImage`. The app sends the source media to n8n as **`fileUrl`** (normalized name for video or image).
- If `REPURPOSER_MODE === 'n8n'` and `N8N_REPURPOSE_WEBHOOK_URL` is set:
  1. **Do not** enqueue the job for local FFmpeg (don’t push to `waitingQueue` / don’t call `processNext()`).
  2. Ensure the job is created in DB and in `jobs` with status `queued` (or `running` if you prefer).
  3. Build **output keys** and presigned PUT URLs for n8n:
     - For each copy `i` in `1..settings.copies`:  
       `key = repurpose/{userId}/{jobId}/repurpose_{i}.mp4` (or `.jpg` if `isImage`).  
       Call `getR2PresignedPutForKey(key, isImage ? 'image/jpeg' : 'video/mp4', 3600)` and collect `{ fileName, uploadUrl, fileUrl }`.
  4. **Callback URL:** e.g. `https://your-app.com/api/video-repurpose/n8n-callback` (use `APP_URL` or `VERCEL_URL` env).
  5. **POST** to `N8N_REPURPOSE_WEBHOOK_URL` with JSON body, e.g.:

```json
{
  "jobId": "<uuid>",
  "userId": "<userId>",
  "fileUrl": "<public URL of the source video or image>",
  "watermarkUrl": "<optional, public URL of watermark image or null>",
  "settings": { "copies": 2, "filters": { ... }, "metadata": { ... } },
  "isImage": false,
  "callbackUrl": "https://your-app.com/api/video-repurpose/n8n-callback",
  "secret": "<N8N_CALLBACK_SECRET>",
  "outputs": [
    { "fileName": "repurpose_001.mp4", "uploadUrl": "<presigned PUT URL>", "fileUrl": "<public R2 URL after upload>" },
    { "fileName": "repurpose_002.mp4", "uploadUrl": "...", "fileUrl": "..." }
  ]
}
```

- If the POST to n8n fails, set the job to failed and store the error (and optionally persist to DB).
- Respond to the client with `{ ok: true, job_id: jobId }` so the frontend can keep polling the existing job status endpoint.

### 2.4 Optional: mark job “processing” when using n8n

- When you send the request to n8n, you can set job status to `running` and message to e.g. `Processing on n8n...` so the UI shows progress until the callback is received.

---

## Part 3: n8n workflow (step-by-step)

### 3.1 Create workflow and trigger

1. New workflow, name e.g. **Video Repurposer**.
2. **Node 1 – Webhook**
   - Trigger: Webhook.
   - HTTP Method: POST.
   - Path: e.g. `repurpose` (full URL will be like `https://your-n8n.com/webhook/repurpose`).
   - Respond: “Immediately” (so the app gets 200 quickly; processing continues in the workflow).
   - Save and copy the **Production Webhook URL** into `N8N_REPURPOSE_WEBHOOK_URL`.

### 3.2 Validate and extract body

3. **Node 2 – Code (optional)**  
   - Input: `$json` from Webhook.  
   - Check for `body.jobId`, `body.fileUrl`, `body.callbackUrl`, `body.secret`, `body.outputs`.  
   - If missing, return a payload that a later “IF” node can use to skip processing or to call callback with `status: "failed"` and `error: "Missing required fields"`.

### 3.3 Download source media

4. **Node 3 – HTTP Request (download source media)**  
   - Method: GET.  
   - URL: `{{ $json.body.fileUrl }}`.  
   - Response: File.  
   - Save binary to a temporary path if your n8n/Execute Command supports it, or use “Send Binary Data” and a temp file path from an expression. (Implementation depends on n8n version: you may need a Code node that writes `$binary.data` to a file and returns the path.)

5. **Node 4 – HTTP Request (download watermark, optional)**  
   - Only if `body.watermarkUrl` is present.  
   - GET `body.watermarkUrl`, response File.  
   - Save to temp path for FFmpeg.

### 3.4 Run FFmpeg

6. **Node 5 – Execute Command (or Code)**  
   - **If FFmpeg is on the same host as n8n:**  
     - Command: e.g. `ffmpeg` with args.  
     - Input: paths from previous nodes (downloaded video, optional watermark).  
     - Output: one or more files per “copy” (e.g. `/tmp/repurpose_001.mp4`, `repurpose_002.mp4`).  
   - **Simplified example (one copy, re-encode only):**  
     `ffmpeg -i /tmp/input.mp4 -c:v libx264 -preset fast -crf 23 /tmp/repurpose_001.mp4`  
   - **Full parity** with your current app would require replicating your `buildFfmpegCommand` logic (filters, watermark, metadata) in a script. Options:  
     - **A)** Code node that runs a small Node script (if n8n has Node and your script is available).  
     - **B)** Execute Command that runs a shell script you deploy next to n8n.  
     - **C)** External “repurpose API” (see 1.1 Option B) that receives `fileUrl`, `watermarkUrl`, `settings`, `outputs` (with `uploadUrl`/`fileUrl`) and does download → FFmpeg → upload to each `uploadUrl` → callback. Then this node is just an HTTP Request to that API.

7. **Loop over copies**  
   - For each copy `i`, run FFmpeg (or call the external API once with all outputs).  
   - If using Execute Command, you may need a **SplitInBatches** over `body.outputs` and one Execute Command per batch, or one command that produces all files.

**Using Execute Command on Alpine (recommended if you use `docker/n8n-ffmpeg`):** The community node **n8n-nodes-ffmpeg-command** uses static FFmpeg binaries that fail on Alpine (`libmvec.so.1` / symbol not found). Use the built-in **Execute Command** node instead: (1) After downloading the file (e.g. with HTTP Request), use a **Code** node to write the binary to a temp file (e.g. `/tmp/repurpose_in.mp4`) and build the full command by taking `body.ffmpegCommand` from the webhook and replacing `{input}` with that path and `{output}` with e.g. `/tmp/repurpose_out.mp4`. (2) In **Execute Command**, set the command to `ffmpeg ` + that string (the app sends args only; e.g. Code node outputs `$json.command` = `"ffmpeg " + body.ffmpegCommand.replace(/\{input\}/, inputPath).replace(/\{output\}/, outputPath)`). (3) The output file is then at `/tmp/repurpose_out.mp4`; use HTTP Request (PUT) to upload it to `body.outputs[0].uploadUrl`. No community node required; the system `ffmpeg` from `apk add ffmpeg` in the custom image is used.

### 3.5 Upload results to R2

8. **Node 6 – HTTP Request (PUT to R2)**  
   - For each output in `body.outputs`:  
     - Method: PUT.  
     - URL: `output.uploadUrl` (from the webhook body).  
     - Body: binary content of the corresponding processed file (from Execute Command / Code node).  
     - Headers: `Content-Type: video/mp4` or `image/jpeg` as appropriate.  
   - In n8n you’ll loop over `body.outputs` and the matching file binaries; each iteration PUTs one file to its `uploadUrl`.  
   - After upload, the file is available at `output.fileUrl` (your app already defined this when building the payload).

### 3.6 Call app callback

9. **Node 7 – HTTP Request (callback)**  
   - Method: POST.  
   - URL: `{{ $json.body.callbackUrl }}`.  
   - Body (JSON):  
     - On success:  
       `{ "jobId": "{{ $json.body.jobId }}", "status": "completed", "secret": "{{ $json.body.secret }}", "outputs": [ { "fileName": "repurpose_001.mp4", "fileUrl": "..." }, ... ] }`  
     - On failure (from a previous error branch):  
       `{ "jobId": "{{ $json.body.jobId }}", "status": "failed", "secret": "{{ $json.body.secret }}", "error": "..." }`  
   - Headers: `Content-Type: application/json`.

### 3.7 Error handling

10. **Error workflow or error branch**  
    - If any step fails (download, FFmpeg, upload), route the run to a node that POSTs to `callbackUrl` with `status: "failed"` and `error: <message>`, then end the run.

---

## Part 4: Payload contract (reference)

### App → n8n (webhook body)

When **Webhook** is triggered by the app, the body (JSON) contains:

| Field | Type | Description |
|-------|------|-------------|
| `jobId` | string | Unique job ID. |
| `userId` | string | For R2 key and DB. |
| `fileUrl` | string | Public URL of source media (video or image). Download this in n8n to get the input file. |
| `watermarkUrl` | string \| null | Optional watermark image URL. |
| `settings` | object | `{ copies, filters?, metadata? }` – same as current app. |
| `isImage` | boolean | True if input is image. |
| `callbackUrl` | string | App endpoint to POST when done (use this in the **HTTP Request** node). |
| `secret` | string | Send this back in the callback body for verification. |
| `outputs` | array | `[{ fileName, uploadUrl, fileUrl }, ...]` – one per copy. **Upload** each processed file to `uploadUrl` (PUT, binary body), then send `fileName` + `fileUrl` in the callback. |
| `copies` | number | Number of output copies (same as `outputs.length`). |
| `metadataInstruction` | object | Pre-built metadata: `{ creationTime, comment, encoder, gps }`. Use for custom logic if needed. |
| `ffmpegCommand` | string | **FFmpeg arguments only** (no `ffmpeg` prefix). For **n8n-nodes-ffmpeg** use as `ffmpegCustomArgs`. Placeholders `{input}` and `{output}`; substitute with actual paths. Example: `-i {input} -c copy -metadata creation_time=... -metadata comment="..." {output}`. For Execute Command, prepend `ffmpeg ` when building the full command. |

**Flow (Webhook → FFMPEG → HTTP Request):**  
1. **Webhook** receives this body.  
2. **FFmpeg node** (n8n-nodes-ffmpeg): Set **Custom args** / **ffmpegCustomArgs** to the webhook’s `ffmpegCommand` (e.g. `{{ $('Webhook').first().json.body.ffmpegCommand }}`). The app sends **args only** (no `ffmpeg` prefix); the node invokes the binary. Replace `{input}` and `{output}` with real paths if the node does not do it. Then upload the result to `body.outputs[i].uploadUrl`.  
3. **HTTP Request** node: POST to `body.callbackUrl` with JSON `{ jobId, status: "completed", secret: body.secret, outputs: [{ fileName, fileUrl }] }`.

### n8n → app (callback body)

| Field | Type | Description |
|-------|------|-------------|
| `jobId` | string | Same as in webhook. |
| `status` | `"completed" \| "failed"` | Final status. |
| `secret` | string | Same secret for verification. |
| `outputs` | array | (If completed) `[{ fileName, fileUrl }, ...]`. |
| `error` | string | (If failed) Error message. |

---

## Part 5: Implementation order

1. **Backend: R2 presigned PUT for a key** – implement and test (e.g. with curl).
2. **Backend: callback endpoint** – implement, secure with `secret`, update job and DB.
3. **Backend: n8n mode in generate** – when `REPURPOSER_MODE=n8n`, build payload, generate presigned URLs, POST to webhook, no local queue.
4. **n8n: minimal workflow** – Webhook → Download video → one FFmpeg command (one copy) → PUT to first `uploadUrl` → callback with `completed` and one output. Verify end-to-end.
5. **n8n: loop for multiple copies** – extend to support `settings.copies` and multiple outputs.
6. **n8n: optional watermark and full filters** – add logic or call external “repurpose API” for full parity with your current FFmpeg pipeline.

---

## Part 6: Security notes

- **Callback:** Only trust the callback if `secret` matches; ignore or reject otherwise.
- **Webhook:** Optionally restrict n8n webhook by IP or add a shared header/query param that n8n expects and your app sends.
- **Presigned URLs:** Use a short expiry (e.g. 1 hour) so leaked URLs are less useful.
- **R2 keys:** Use a dedicated prefix like `repurpose/{userId}/{jobId}/` so you can scope permissions or lifecycle rules if needed.

---

## Part 7: Testing

1. **App only:** Set `REPURPOSER_MODE=n8n`, trigger a repurpose job with a public source URL (sent as `fileUrl`). Check logs: webhook URL should be called with the correct body.
2. **n8n only:** Use “Test workflow” with a manual JSON body matching the contract; run and confirm FFmpeg runs and callback is sent.
3. **E2E:** Run a real job from the UI; confirm job goes to “running” then “completed” and files are downloadable from the app.

Once this is in place, the repurposer runs entirely off Vercel for the heavy part, and stays within the 250 MB limit.

---

## Part 8: Test payload to set the n8n workflow

Use this payload to trigger your webhook and configure the **FFMPEG** and **HTTP Request** nodes. A copy lives in **`docs/n8n-repurpose-test-payload.json`**.

### 1. Replace placeholders

- **`callbackUrl`** → Your app base URL + `/api/video-repurpose/n8n-callback`  
  e.g. `https://your-app.vercel.app/api/video-repurpose/n8n-callback`
- **`secret`** → Same value as `N8N_CALLBACK_SECRET` in your app env.
- **`uploadUrl`** / **`fileUrl`** → For a **real** test (upload to R2), start a repurpose job from the app once with n8n mode; the app will POST a real payload to n8n. For a **structure-only** test (no real upload), you can leave placeholder URLs; the HTTP Request callback will still work if you send the same `jobId` and `secret`.

### 2. Trigger the webhook with the payload

**Option A – curl (production webhook URL):**

```bash
curl -X POST "https://YOUR_N8N_HOST/webhook/2362a8d6-7aa6-48da-afea-f6ae69182771" \
  -H "Content-Type: application/json" \
  -d @docs/n8n-repurpose-test-payload.json
```

**Option B – n8n “Test workflow”:**  
In the Webhook node, use “Listen for Test Event”, then from another tab or Postman send a POST with the JSON body to the test URL n8n shows.

**Option C – From the app:**  
Set `REPURPOSER_MODE=n8n`, `N8N_REPURPOSE_WEBHOOK_URL`, `N8N_CALLBACK_SECRET`, and run a repurpose from the UI; the app will POST the real payload (with real presigned `uploadUrl` and `fileUrl`) to your webhook.

### 3. Payload shape (reference) – metadata only, no custom prompt

The app sends **metadataInstruction** (built from `settings.metadata`) so the n8n FFMPEG node only edits metadata (e.g. `-metadata creation_time=... -metadata comment=...`). There is no custom prompt in the payload.

```json
{
  "jobId": "test-job-aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee",
  "userId": "test-user-id",
  "fileUrl": "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
  "watermarkUrl": null,
  "settings": { "copies": 1, "filters": {}, "metadata": { "device_metadata": {...}, "timestamps": {...}, "gps_location": {...} } },
  "isImage": false,
  "callbackUrl": "https://YOUR_APP_URL/api/video-repurpose/n8n-callback",
  "secret": "YOUR_N8N_CALLBACK_SECRET",
  "copies": 1,
  "metadataInstruction": {
    "creationTime": "2025-03-15T12:00:00.000Z",
    "comment": "Recorded on iPhone 16 Pro",
    "encoder": "Apple iPhone 16 Pro",
    "gps": { "lat": 39.8, "lng": -98.5, "alt": 120 }
  },
  "outputs": [
    { "fileName": "repurpose_001.mp4", "uploadUrl": "https://...", "fileUrl": "https://..." }
  ]
}
```

### 4. Callback body to send from n8n (HTTP Request node)

**On success:**

```json
{
  "jobId": "{{ $json.body.jobId }}",
  "status": "completed",
  "secret": "{{ $json.body.secret }}",
  "outputs": [
    {
      "fileName": "repurpose_001.mp4",
      "fileUrl": "{{ $json.body.outputs[0].fileUrl }}"
    }
  ]
}
```

**On failure:**

```json
{
  "jobId": "{{ $json.body.jobId }}",
  "status": "failed",
  "secret": "{{ $json.body.secret }}",
  "error": "FFmpeg failed: ..."
}
```

In n8n, pass the webhook body through the flow (e.g. so `$json.body` is available in the HTTP Request node). If your nodes are in a different order, use the correct item reference (e.g. `$('Webhook').first().json.body`).

**"Command is not a valid ffmpeg command":** (1) For **n8n-nodes-ffmpeg**, use `ffmpegCommand` in **ffmpegCustomArgs** (args only; the app does not send the `ffmpeg` prefix). (2) If the node runs after HTTP Request (download), get the command from the Webhook: `{{ $('Webhook').first().json.body.ffmpegCommand }}`. (3) Ensure the expression returns a string (not undefined).

**`libmvec.so.1` / `symbol not found` (n8n-nodes-ffmpeg-command on Alpine):** The community node ships **static FFmpeg binaries built for glibc** (e.g. Ubuntu). n8n’s official Docker image is **Alpine** (musl libc), so those binaries fail with `Error loading shared library libmvec.so.1` and many `symbol not found` errors. **Fix:** Do **not** use the `n8n-nodes-ffmpeg-command` node on Alpine. Use the **custom image** from this repo (`docker/n8n-ffmpeg`) which installs FFmpeg via `apk add ffmpeg`, then run FFmpeg with the built-in **Execute Command** node: command = the string from the webhook (e.g. `{{ $('Webhook').first().json.body.ffmpegCommand }}`) with `{input}` and `{output}` replaced by the real file paths (e.g. from a Code node that writes the downloaded binary to `/tmp/input.mp4` and sets output path `/tmp/output.mp4`, then builds `"ffmpeg " + ffmpegCommand.replace('{input}', inputPath).replace('{output}', outputPath)` and passes it to Execute Command). So: **Webhook → download file (HTTP Request) → Code (save binary to /tmp, build full command) → Execute Command (run the built command) → upload to R2 → callback.**
