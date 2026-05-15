# External Workers & Repository Registry

Single source of truth for every external worker and deployment repo used by ModelClone.
No worker source code belongs in this monorepo **except** the Hetzner FFmpeg worker
(local-only bundle in `ffmpeg-worker-deploy/` — no upstream git repo).

---

## Application Repositories

| Environment | GitHub URL | Local remote name | Notes |
|-------------|------------|-------------------|-------|
| **Production** | https://github.com/typekpaco2002/mdlcln | `typekpaco` | Main production deployment (note: `mdlcln`, not `mdcln`) |
| **Testing / staging** | https://github.com/mconqeuroror/mdcln-testing | `mtesting` | CI + staging deploys |

---

## Worker Repositories

### 1. RunPod NSFW Image Worker

| Field | Value |
|-------|-------|
| **Repo** | https://github.com/mconqeuroror/mdclnworker |
| **Local mirror** | `runpod-mdcln/` *(not present — deploy from repo)* |
| **Docker Hub** | `mconwf/modelclone-worker:latest` |
| **App env vars** | `RUNPOD_ENDPOINT_ID`, `RUNPOD_API_KEY` |
| **Exposes** | RunPod serverless `/run` + `/status` |
| **Used by** | `src/services/modelcloneX.service.js` |

ComfyUI v0.17.2 · GPU ≥ 20 GB VRAM (4090 / A100)

---

### 2. RunPod Motion Worker (Wan 2.2 Animate)

| Field | Value |
|-------|-------|
| **Repo** | https://github.com/mconqeuroror/motion |
| **Local mirror** | `runpod-mdcln-motion/` (synced from repo above) |
| **Docker Hub** | *(set in worker repo CI)* |
| **App env vars** | *(set in `nsfw-motion.service.js` — RunPod endpoint + API key)* |
| **Exposes** | RunPod serverless `/run` + `/status` |
| **Used by** | `src/services/nsfw-motion.service.js` (MotionX + NSFW motion control) |

ComfyUI v0.19.3 · ~46 GB models · GPU ≥ 24 GB VRAM (4090 / A100 / H100)

> **Sync**: `git -C runpod-mdcln-motion pull` to update the local mirror from the upstream repo.

---

### 3. Hetzner FFmpeg Worker

| Field | Value |
|-------|-------|
| **Repo** | **None — local bundle only** |
| **Local source** | `ffmpeg-worker-deploy/` (Dockerfile + app bundle; deploy as zip to Hetzner/EasyPanel) |
| **App env vars** | `FFMPEG_WORKER_URL`, `FFMPEG_WORKER_FALLBACK_URL`, `FFMPEG_WORKER_API_KEY` |
| **Exposes** | `POST /job` · `POST /transcode` · `POST /frames` · `GET /health` |
| **Used by** | Video repurposer, reformatter, frame extraction, NSFW motion preprocessing |

Deploy docs: `docs/DEPLOY_RAILWAY_HETZNER_FFMPEG.md`  
Client docs: `docs/MODELCLONE_FFMPEG_WORKER_CLIENT.md`  
Callback contract: `docs/FFMPEG_WORKER_CALLBACK.md`  
Integration test: `scripts/test-ffmpeg-worker.mjs`

---

## Dead / Removed Workers

| Worker | Status |
|--------|--------|
| n8n + FFmpeg (`docker/n8n-ffmpeg/`) | Deleted — unused code, never in production |
| EasyPanel reel scraper (`deploy/easypanel-reel-worker/`) | Deleted — replaced by Apify; unused |

---

## Adding a new worker

1. Create a **dedicated repo** for the worker source + Dockerfile.
2. Add an entry to this file with the repo URL, Docker Hub image, env vars, and which `src/services/` file consumes it.
3. Wire env vars into `.env.example` with a comment pointing here.
4. If no git repo exists, add a local bundle folder and note it under **Local source** above.
