# FFmpeg worker (`ffpmeg`) — optional callback (no polling)

When **modelclone** (or n8n) sends `POST /job` to the worker, the response already includes `outputUrls` and `outputFileNames`. For **async-style** integration, the worker can also **POST the same JSON** to your app when the job finishes.

## Request body (extra fields)

| Field | Type | Description |
|--------|------|-------------|
| `callbackUrl` | string | HTTPS URL to `POST` when the job completes (success or failure). |
| `callbackSecret` | string | Optional. Sent as header `X-Callback-Secret` so your route can verify the caller. |
| `jobRef` | any JSON | Optional. Echoed back in the callback payload (e.g. `{ "jobId": "uuid" }` from Prisma). |

## Callback payload — success

Same as the HTTP 200 body from `/job`:

```json
{
  "ok": true,
  "outputUrls": ["https://..."],
  "outputFileNames": ["stem_repurpose_001.jpg"],
  "jobRef": { "jobId": "..." }
}
```

## Callback payload — failure

Same as the HTTP 500 body:

```json
{
  "ok": false,
  "error": "Job failed",
  "message": "FFmpeg failed…",
  "jobRef": { "jobId": "..." }
}
```

## Modelclone (future)

Add a route e.g. `POST /api/video-repurpose/worker-callback` that:

1. Verifies `X-Callback-Secret` matches `FFMPEG_WORKER_CALLBACK_SECRET` in env.
2. Reads `jobRef.jobId`, updates `repurposeJob` + outputs in the DB.
3. Returns `200` quickly.

The worker does **not** wait for the callback to succeed; failures are logged only.

## Env (worker)

| Variable | Default | Description |
|----------|---------|-------------|
| `FFMPEG_WORKER_CALLBACK_TIMEOUT_MS` | `120000` | Max wait for callback HTTP (capped at 300s). |
| `FFMPEG_WORKER_JSON_LIMIT` | `4mb` | Max JSON body size for `/job`. |
