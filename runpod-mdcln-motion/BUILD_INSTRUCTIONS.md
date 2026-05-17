# ModelClone NSFW Motion-Control Worker — Build & Deploy

Wan 2.2 Animate (14B) RunPod Serverless worker. Takes a reference image
+ a driving video and produces an MP4 of the reference subject performing
the motion of the driving video.

This worker is **independent** from the existing image worker
(`runpod-mdcln/`). They use different ComfyUI versions, different model sets,
and different custom node packs. Build/push/deploy them as two separate
endpoints.

## Architecture

- **Docker image**: ComfyUI v0.19.3 + custom nodes + Python deps + `handler.py`
- **NSFW motion control only** — driving-video → reference-image animation
- **Network volume** at `/runpod-volume` *(strongly recommended)* — ~46GB of
  models download here on first boot via `start.sh`. Without a volume the cold
  start downloads them every spin-up.
- **API**: backend POSTs a Comfy API graph (`input.prompt`) plus a base64
  image (reference) and a base64 video (driving). The handler waits for
  `VHS_VideoCombine` node `226` (or whatever `output_node_id` you pass) and
  returns the resulting MP4 base64-encoded under `videos[]`.

## Models (~28GB total)

| File | Source | Size | Used by node |
|------|--------|------|--------------|
| `diffusion_models/Wan22Animate/Wan2_2-Animate-14B_fp8_scaled_e4m3fn_KJ_v2.safetensors` | `Kijai/WanVideo_comfy_fp8_scaled` | ~16GB | `UNETLoader` (356) |
| `vae/wan_2.1_vae.safetensors` | `Comfy-Org/Wan_2.1_ComfyUI_repackaged` | ~242MB | `VAELoader` (329) |
| `text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors` | `Comfy-Org/Wan_2.1_ComfyUI_repackaged` | ~6.4GB | `CLIPLoader` (333) |
| `clip_vision/clip_vision_h.safetensors` | `Comfy-Org/Wan_2.1_ComfyUI_repackaged` | ~1.2GB | `CLIPVisionLoader` (348) |
| `loras/wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors` | `Comfy-Org/Wan_2.2_ComfyUI_Repackaged` | ~1.2GB | `LoraLoaderModelOnly` (327) |
| `loras/lightx2v_I2V_14B_480p_cfg_step_distill_rank256_bf16.safetensors` | `Kijai/WanVideo_comfy/Lightx2v` | ~2.7GB | `LoraLoaderModelOnly` (355) |
| `detection/vitpose-l-wholebody.onnx` | `JunkyByte/easy_ViTPose/onnx/wholebody` | ~1.2GB | `OnnxDetectionModelLoader` (354) |
| `detection/yolov10m.onnx` | `Kalray/yolov10` | ~62MB | `OnnxDetectionModelLoader` (354) |

> ⚠ **Diffusion model swap (May 2026, RunningHub-parity migration)** — replaced the
> bf16 build with Kijai's `fp8_scaled_e4m3fn_KJ_v2` variant to match the
> `IG+MOTION+CONTROL` workflow the backend ships when migrating Motion X off RunningHub:
>
> | What | Before (legacy) | After (current) |
> |------|-----------------|-----------------|
> | UNet path | `diffusion_models/wan2.2_animate_14B_bf16.safetensors` | `diffusion_models/Wan22Animate/Wan2_2-Animate-14B_fp8_scaled_e4m3fn_KJ_v2.safetensors` |
> | UNet size | ~34 GB | ~16 GB |
> | `UNETLoader.weight_dtype` | `default` | `fp8_e4m3fn_fast` |
> | HF source | `Comfy-Org/Wan_2.2_ComfyUI_Repackaged/.../split_files/diffusion_models/` | `Kijai/WanVideo_comfy_fp8_scaled/Wan22Animate/` |
>
> If a caller still POSTs a graph that references the old bf16 filename, either
> (a) restore the bf16 download by adding it back to `setup_models.sh` /
> `start.sh`, or (b) rewrite the caller's `prompt` (UNETLoader node) to the new
> path/dtype. The shipped `workflow_api.json` already uses the new path.
>
> Other workflow filename normalizations carried over from earlier patches:
>
> - Node 327 lora: `wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors`
> - Node 355 lora: `lightx2v_I2V_14B_480p_cfg_step_distill_rank256_bf16.safetensors`
> - Node 354 vitpose: `vitpose-l-wholebody.onnx`

> ℹ️ **Optional: Sage Attention** — node `322` (`PathchSageAttentionKJ`) ships with
> `sage_attention: "auto"`. The Dockerfile attempts a best-effort install of the
> `sageattention` wheel; when present, KJNodes flips on Sage Attention for a
> measurable speedup on H100 / 4090. If the wheel fails to build for your CUDA
> userland (common with sage 3.x), the build still succeeds and the workflow
> transparently falls back to default PyTorch attention.

## Custom nodes

| Need (workflow `class_type`) | Package (in `custom_nodes.list`) |
|------------------------------|----------------------------------|
| `PoseAndFaceDetection`, `DrawViTPose`, `OnnxDetectionModelLoader` | `kijai/ComfyUI-WanAnimatePreprocess` |
| `ImageConcatMulti`, `ImageResizeKJv2`, `GetImageRangeFromBatch`, `GetImageSize`, `wanBlockSwap`, `TorchCompileModelWanVideoV2`, `PathchSageAttentionKJ`, `ModelPatchTorchSettings` | `kijai/ComfyUI-KJNodes` |
| `VHS_LoadVideo`, `VHS_VideoCombine`, `VHS_VideoInfo` | `Kosinkadink/ComfyUI-VideoHelperSuite` |
| `Seed (rgthree)`, `Any Switch (rgthree)` | `rgthree/rgthree-comfy` |
| `easy int/float/boolean/ifElse/compare/positive/promptReplace/convertAnything/whileLoopStart/whileLoopEnd/lengthAnything/batchAnything` | `yolain/ComfyUI-Easy-Use` |
| `SimpleMath+`, `SimpleMathDual+` | `cubiq/ComfyUI_essentials` |
| `MathExpression\|pysssss` | `pythongosssss/ComfyUI-Custom-Scripts` |
| `WanAnimateToVideo`, `TrimVideoLatent`, samplers, loaders | ComfyUI core (v0.19.3) |

## Quick deploy

### 1. Build & push image

```bash
cd runpod-mdcln-motion
docker build -t yourdockerhub/modelclone-motion-worker:latest .
docker push yourdockerhub/modelclone-motion-worker:latest
```

### 2. RunPod serverless endpoint

- Image: your pushed image
- Network volume mounted at `/runpod-volume` (recommended — first boot will
  download ~46GB into it; subsequent boots reuse the volume)
- GPU: 4090 / A100 / H100 class (~24GB+ VRAM)
- No API keys needed — all models are public on HuggingFace

### 3. Sample request

```jsonc
{
  "input": {
    "prompt": { /* contents of workflow_api.json */ },
    "upload_images": [
      { "node_id": "167", "filename": "ref.jpg",   "data": "<base64 jpg>" }
    ],
    "upload_videos": [
      { "node_id": "52",  "filename": "drive.mp4", "data": "<base64 mp4>" }
    ],
    "output_node_id": "226",
    "timeout": 1800
  }
}
```

Response on success:

```jsonc
{
  "status": "COMPLETED",
  "prompt_id": "abc...",
  "videos": [
    {
      "filename": "KIARA_AnimateX_00001.mp4",
      "node_id": "226",
      "format": "video/h264-mp4",
      "subfolder": "",
      "type": "output",
      "base64": "AAAA..."
    }
  ]
}
```

### Output transports (strongly recommended: presigned URL)

The worker supports **two output transports**, picked at request time by the
backend:

1. **PREFERRED — presigned PUT URL (small response, reliable webhooks)**.
   Backend mints a presigned R2 PUT URL via
   `getR2PresignedPutForKey()` and passes it as `output_upload_url` in the
   request input (alongside `output_public_url` + `output_key` to round-trip).
   The worker PUTs the rendered mp4 bytes directly to R2 and returns only a
   tiny URL payload:

   ```jsonc
   {
     "status": "COMPLETED",
     "prompt_id": "abc...",
     "output_url": "https://pub-xxx.r2.dev/generations/.../<id>_<ts>_<rand>.mp4",
     "output_key": "generations/...mp4",
     "videos": [{ "filename": "KIARA_...mp4", "url": "https://...mp4", "size": 38123456 }]
   }
   ```

2. **LEGACY FALLBACK — base64 in webhook body** (used when no
   `output_upload_url` is provided). Encodes the full mp4 as base64 inline.
   Works on long-lived hosts, but webhooks/proxies (e.g. Vercel serverless
   has a **4.5 MB body cap**) will silently truncate >5 MB payloads. The
   backend was burned by this — 30 s motion clips ≈ 30-80 MB base64, which
   meant webhooks never reached our handler and rows stayed in `processing`
   until the watchdog timed them out. The new path is the fix.

> ⚠ Always supply `output_upload_url` when R2 is configured — there is no
> reliable way to deliver 30-80 MB inline through serverless edges.

## File overview

| File | Purpose |
|------|---------|
| `Dockerfile` | ComfyUI v0.19.3 + nodes + deps |
| `start.sh` | Models, symlinks, ComfyUI, handler |
| `handler.py` | RunPod handler (`prompt`, optional `upload_images` + `upload_videos`) |
| `custom_nodes.list` | GitHub repos for custom nodes |
| `setup_custom_nodes.sh` | Clone list during image build |
| `setup_models.sh` | Optional pre-bake at build time (most operators skip this) |
| `workflow_api.json` | Reference Wan 2.2 Animate graph with patched filenames |

## Troubleshooting

1. **`RuntimeError: The NVIDIA driver on your system is too old`**
   (from `torch._C._cuda_init` / `comfy.model_management`) — the *host* GPU
   driver is older than the CUDA user-mode build bundled with PyTorch in the
   image. The Dockerfile uses `runpod/pytorch:1.0.3-cu1290-torch271-ubuntu2204`
   (PyTorch 2.7.1 + CUDA 12.9) so Comfy/Wan and KJ torch patches match current
   stacks. If this error appears on a pod with an older driver, switch the base
   in `Dockerfile` to `runpod/pytorch:1.0.3-cu1281-torch271-ubuntu2204` (same
   torch, slightly older CUDA userland) or move the endpoint to GPUs with a
   newer NVIDIA driver. Updating PyTorch in isolation does not fix a true
   host driver mismatch.
2. **`Failed to set fp16 accumulation, this requires pytorch 2.7.1 or higher`**
   — the base image must stay on **torch 2.7.1+** (the `cu1290`/`cu1281`
   `torch271` tags). Do not downgrade the RunPod base to `torch260`.
3. **`CUDA error: no kernel image is available for execution on the device`**
   on Wan/CLIP — usually PyTorch was built without support for that GPU
   architecture. The `1.0.3-cu1290-torch271` line targets newer data-center /
   consumer stacks; if it persists, confirm the pod GPU and open an issue with
   `nvidia-smi` + `python3 -c "import torch; print(torch.__version__, torch.cuda.get_device_name(0))"`.
4. **`Unknown node types: WanAnimateToVideo`** — your image is built on the
   wrong ComfyUI tag. The Dockerfile pins `v0.19.3`; do not downgrade.
5. **`OnnxDetectionModelLoader` errors / can't find vitpose** — make sure
   `models/detection/vitpose-l-wholebody.onnx` and `models/detection/yolov10m.onnx`
   both exist and are >10KB. The self-heal block in `start.sh` will redownload
   on next boot if a previous attempt left a 0-byte file.
6. **Black / static output** — known SageAttention + torch-compile interaction
   on RTX 30xx. Set the `296` (`TORCH COMPILE`) node to `false` in the request
   payload to disable torch.compile.
   - **`nvrtc: error: failed to open libnvrtc-builtins.so.13.0`** at the
     KSampler step — PyTorch's jiterator tried to JIT-compile a kernel (e.g.
     `lgamma_kernel_vectorized4_kernel`) via CUDA 13 NVRTC while the matching
     builtins library was missing. The Kijai `IG+MOTION+CONTROL` workflow ships
     `sa_solver` + `linear_quadratic` on KSampler `353`, and `sa_solver`'s
     stochastic Adams coefficient compute is the only sampler that fires
     `lgamma` on a CUDA tensor. Two fixes (both shipped):
     1. `workflow_api.json` swaps node `353` to `euler` + `simple` — quality
        is comparable at 4 steps + CFG 1 with the lightx2v step-distilled
        LoRAs and dodges the JIT path entirely. Effective on next request
        (the backend reads this file at submit time).
     2. The Dockerfile installs both `nvidia-cuda-nvrtc-cu12` and
        `nvidia-cuda-nvrtc-cu13` so whichever NVRTC PyTorch resolves at
        runtime has its matching builtins on disk. Effective after image
        rebuild — keeps `sa_solver` available for future workflow revisions
        if you want to flip it back.
7. **`ModuleNotFoundError: No module named 'sageattention'`** — the graph
   `PathchSageAttentionKJ` (node `322`) must not use `sage_attention: "auto"` on
   workers without the optional `sageattention` wheel. The API and shipped
   `workflow_api.json` set `sage_attention` to `disabled` (normal PyTorch
   attention). If you send a raw Comfy `prompt` with `auto`, add the package
   to the image or change the node to `disabled`.
8. **`ImportError: numpy._core.multiarray`** — a custom node bumped numpy to
   2.x. The Dockerfile re-pins `numpy<2` after node install, but a stale image
   may still have it. Rebuild from scratch.
9. **OOM during VAE decode** — bump `BLOCK SWAP` (node `276`) from 0 up to
   20–30 to offload more transformer blocks to CPU. Trades speed for VRAM.
10. **Debug missing nodes** — call the handler with
   `{"input": {"debug_nodes": true}}` and compare the returned list to the
   workflow `class_type` values.
11. **Workers show “unhealthy” right after deploy** — `pip install runpod` with
   no version pulled **runpod 1.9+**, which runs startup **fitness checks** (GPU
   memory test, min free disk % on `/`, RAM) *before* the worker heartbeats.
   Full model mirrors or busy GPUs often fail those checks and the process
   exits with code 1. The Dockerfile pins **`runpod==1.8.2`** (no fitness) and
   sets `RUNPOD_MIN_DISK_PERCENT=1` / `RUNPOD_GPU_TEST_TIMEOUT=120` as a
   fallback if you upgrade the SDK later. You can also set endpoint env
   `RUNPOD_SKIP_AUTO_SYSTEM_CHECKS=true` or `RUNPOD_SKIP_GPU_CHECK=true` in the
   RunPod console (use sparingly).
