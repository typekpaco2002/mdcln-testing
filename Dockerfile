# Main app (Railway). FFmpeg jobs are delegated to FFMPEG_WORKER_URL when set.
FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build client + server bundle
RUN npm run build

ENV NODE_ENV=production
EXPOSE 5000

# Railway sets PORT; server uses process.env.PORT || 5000
CMD ["node", "dist/index.js"]
