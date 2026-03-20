# FFmpeg worker (Docker)

HTTP service that runs **video/image repurposer** jobs (`processVideoBatch` / `processImageBatch`) with system **FFmpeg** + **exiftool**.

**Standalone repo (minimal, Docker-only):** [`github.com/typekpaco2002/ffpmeg`](https://github.com/typekpaco2002/ffpmeg) — use that for Hetzner/Easypanel/Railway worker deploys.

## Build (from this monorepo root)

The `Dockerfile` expects the **full app repo root** (it copies `package.json` and `src/` used by `src/services/video-repurpose.service.js`).

```bash
docker build -f ffmpeg-worker/Dockerfile -t ffmpeg-worker .
```

## Run

```bash
docker run -d --name ffmpeg-worker -p 3100:3100 \
  -e PORT=3100 \
  -e FFMPEG_WORKER_API_KEY=your-shared-secret \
  ffmpeg-worker
```

- `GET /health` — FFmpeg/ffprobe check  
- `POST /job` — requires header `X-API-Key: <same as FFMPEG_WORKER_API_KEY>`

See `docs/DEPLOY_RAILWAY_HETZNER_FFMPEG.md` in this repo for Railway + Hetzner deployment.
