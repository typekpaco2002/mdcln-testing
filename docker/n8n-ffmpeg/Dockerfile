# n8n with FFmpeg for Video Repurposer workflow
# Build: docker build -t n8n-ffmpeg .
# Run: docker run -d --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n n8n-ffmpeg

FROM n8nio/n8n:latest
USER root
RUN apk add --no-cache ffmpeg
USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
CMD ["n8n", "start"]
