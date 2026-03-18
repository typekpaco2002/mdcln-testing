# n8n + FFmpeg

Custom n8n image with FFmpeg installed for the Video Repurposer workflow. The official image runs as a non-root user, so FFmpeg must be installed at build time.

## Build

```bash
docker build -t n8n-ffmpeg .
```

## Run

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=yourpassword \
  n8n-ffmpeg
```

Use the same env vars and volumes you normally use for n8n. Open http://localhost:5678 to access the editor. FFmpeg is available inside the container for **Execute Command** nodes. Do not use the community node **n8n-nodes-ffmpeg-command** in this image — it bundles glibc-built binaries that fail on Alpine (libmvec.so.1 / symbol not found). Use the built-in Execute Command node with the system `ffmpeg` instead.

## Verify FFmpeg

```bash
docker exec n8n ffmpeg -version
```
