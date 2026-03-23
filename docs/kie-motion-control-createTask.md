# KIE `createTask` — motion-control (reference)

Use the same wire format as production content-studio for motion-control:

```json
{
  "model": "kling-2.6/motion-control",
  "callBackUrl": "https://your.app/api/kie/callback",
  "input": "{\"prompt\":\"…\",\"input_urls\":[\"https://…\"],\"video_urls\":[\"https://…\"],\"mode\":\"1080p\",\"character_orientation\":\"video\"}"
}
```

For **`kling-3.0/motion-control`**, add:

```json
"background_source": "input_video"
```

Implementation: `generateVideoWithMotionKieInternal` + `normalizeKieCreateRequestBody` in `src/services/kie.service.js`.
