# Deploy: Railway (app) + Hetzner (FFmpeg worker)

This setup runs the main app on **Railway** (from GitHub) and offloads FFmpeg repurpose jobs to a **worker** on your **Hetzner** server. The app does not need ffmpeg or exiftool when the worker is configured.

## Architecture

- **Railway**: Next/Express app, DB, R2 uploads. When a user runs a repurpose job, the app uploads the input to R2, sends a job payload to the worker, and receives output URLs.
- **Hetzner worker**: Small Node server with ffmpeg + exiftool. Receives job (input URL, settings, presigned PUT URLs for outputs), runs `processVideoBatch` / `processImageBatch`, uploads results to R2, returns public URLs.

## 1. Push to GitHub

Ensure the repo has:

- Root `Dockerfile` (main app)
- `ffmpeg-worker/` with `server.js` and `Dockerfile`
- `.env.example` (reference only; do not commit `.env`)

```bash
git add .
git commit -m "Add Railway + Hetzner FFmpeg worker setup"
git push origin main
```

## 2. Deploy main app on Railway

1. In [Railway](https://railway.app), **New Project** → **Deploy from GitHub repo**.
2. Select the repo and (if needed) the **root** directory so Railway sees the root `Dockerfile`.
3. **Variables**: Add env vars (see `.env.example`). At minimum:
   - `DATABASE_URL` (Postgres from Railway or external)
   - `SESSION_SECRET`, `JWT_SECRET`
   - `VITE_API_URL` = your Railway app URL (e.g. `https://xxx.up.railway.app`)
   - **R2**: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
   - **Worker**: `FFMPEG_WORKER_URL`, `FFMPEG_WORKER_API_KEY` (set after worker is deployed)
4. **Deploy**: Railway will build with the root `Dockerfile` and run `node dist/index.js`. Set **Root Directory** to the app root if your repo is a monorepo.

## 3. Deploy FFmpeg worker on Hetzner

On your Hetzner server (or any VPS with Docker):

```bash
# Clone the repo (or copy the project folder)
git clone https://github.com/your-org/your-repo.git
cd your-repo

# Build and run the worker (port 3100)
docker build -f ffmpeg-worker/Dockerfile -t ffmpeg-worker .
docker run -d --name ffmpeg-worker -p 3100:3100 \
  -e PORT=3100 \
  -e FFMPEG_WORKER_API_KEY=your-shared-secret \
  ffmpeg-worker
```

- Use the **same** `FFMPEG_WORKER_API_KEY` in Railway and in the worker container.
- Expose 3100 (or your chosen port) and put a reverse proxy (e.g. nginx/Caddy) in front with HTTPS. Set `FFMPEG_WORKER_URL` on Railway to that URL, e.g. `https://ffmpeg.yourdomain.com` (no trailing slash).

**Health check:**

```bash
curl -H "X-API-Key: your-shared-secret" https://ffmpeg.yourdomain.com/health
# => {"ok":true,"service":"ffmpeg-worker"}
```

## 4. Configure Railway to use the worker

In Railway project variables set:

- `FFMPEG_WORKER_URL` = `https://ffmpeg.yourdomain.com` (worker base URL)
- `FFMPEG_WORKER_API_KEY` = same value as on the worker

Redeploy the app so it picks up the new variables. Repurpose jobs will then be sent to the Hetzner worker; no ffmpeg is required on Railway.

## 5. Optional: worker without Docker

On the Hetzner server (Node 20 + ffmpeg + exiftool):

```bash
sudo apt-get update && sudo apt-get install -y ffmpeg libimage-exiftool-perl
cd /path/to/repo
npm ci --omit=dev
PORT=3100 FFMPEG_WORKER_API_KEY=your-shared-secret node ffmpeg-worker/server.js
```

Run under systemd or PM2 for production.

## Env summary

| Where       | Variable               | Description                          |
|------------|------------------------|--------------------------------------|
| Railway    | `FFMPEG_WORKER_URL`    | Worker base URL (HTTPS)              |
| Railway    | `FFMPEG_WORKER_API_KEY` | Shared secret for POST /job         |
| Railway    | R2_*                   | Required for worker path (uploads)  |
| Hetzner    | `PORT`                 | Worker port (default 3100)          |
| Hetzner    | `FFMPEG_WORKER_API_KEY` | Same as Railway                    |

If `FFMPEG_WORKER_URL` or R2 is not set, the app falls back to local ffmpeg (if available) or WASM.

## Optional: worker callback (no polling)

After each job, the worker can `POST` the same JSON to your app — see **`docs/FFMPEG_WORKER_CALLBACK.md`**. Redeploy the worker image after pulling changes that add `callbackUrl` / `jobRef` support.
