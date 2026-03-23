# KIE `createTask` — motion-control (reference)

Do **not** double-serialize `input`. The HTTP JSON body must look like:

```json
{
  "model": "kling-2.6/motion-control",
  "callBackUrl": "https://your.app/api/kie/callback",
  "input": {
    "prompt": "…",
    "input_urls": ["https://…"],
    "video_urls": ["https://…"],
    "mode": "1080p"
  }
}
```

For **`kling-3.0/motion-control`**, add:

```json
"background_source": "input_video"
```

Wrong (breaks API): `"input": "{\"prompt\":...}"`  ← string value instead of object.

Implementation: `normalizeKieCreateRequestBody` + `kieCreateTask` in `src/services/kie.service.js`.
