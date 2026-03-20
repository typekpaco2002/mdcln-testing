# Calling the FFmpeg worker from modelclone

Use the same **`settings`** object the repurposer already builds (`copies`, `filters`, `metadata`) — see `VideoRepurposerPage.jsx` and `POST /video-repurpose/prepare-browser`.

## Outline

1. Upload input (and optional watermark) to R2; build **presigned GET** URLs for the worker to download.
2. For each output copy, create **presigned PUT** + public URL (same as `prepare-browser`).
3. `POST` to `FFMPEG_WORKER_URL/job` with `X-API-Key: FFMPEG_WORKER_API_KEY`.

## Example (Node / server)

```js
const res = await fetch(`${process.env.FFMPEG_WORKER_URL.replace(/\/$/, "")}/job`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.FFMPEG_WORKER_API_KEY,
  },
  body: JSON.stringify({
    inputUrl: presignedGetInput,
    watermarkUrl: presignedGetWatermarkOrUndefined,
    isImage: false,
    settings: { copies, filters, metadata },
    outputPutUrls: outputs.map((o) => ({
      putUrl: o.uploadUrl,
      publicUrl: o.publicUrl,
      contentType: "video/mp4",
    })),
    jobRef: { jobId: prismaJob.id },
    callbackUrl: `${process.env.APP_PUBLIC_URL}/api/video-repurpose/worker-callback`,
    callbackSecret: process.env.FFMPEG_WORKER_CALLBACK_SECRET,
  }),
});
const data = await res.json();
if (!data.ok) throw new Error(data.message || "Worker failed");
```

Wire **`/api/video-repurpose/worker-callback`** in a later PR (verify `X-Callback-Secret`, update `repurposeJob`).

## Env (modelclone)

| Variable | Description |
|----------|-------------|
| `FFMPEG_WORKER_URL` | Primary worker base URL (no trailing slash). |
| `FFMPEG_WORKER_FALLBACK_URL` | Optional backup (e.g. Easypanel ffpmeg) if primary is down — same API and usually same `FFMPEG_WORKER_API_KEY`. |
| `FFMPEG_WORKER_API_KEY` | Shared secret (same as worker’s `FFMPEG_WORKER_API_KEY`) |
| `FFMPEG_WORKER_CALLBACK_SECRET` | Optional; must match what you send as `callbackSecret` and validate in callback route |

Use `getFfmpegWorkerBaseUrls()` from `src/lib/ffmpeg-worker-env.js` to get `[primary, …fallback]` for ordered retries.
