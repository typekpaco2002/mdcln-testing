# ModelClone RunPod Serverless Worker - Build & Deploy

## Architecture
- Docker image contains: ComfyUI + custom nodes + Python deps + handler
- Network Volume at `/runpod-volume` contains: model files (auto-downloaded on first boot)
- `start.sh` auto-downloads ALL models from HuggingFace to the network volume

## Quick Deploy (with Network Volume)

### 1. Build & Push Docker Image
```bash
cd runpod-docker
docker build -t yourdockerhub/modelclone-worker:latest .
docker push yourdockerhub/modelclone-worker:latest
```

### 2. Create/Verify Network Volume
- Create a 200GB Network Volume in RunPod (or use existing one)
- It will be mounted at `/runpod-volume`

### 3. Create Serverless Endpoint
- Docker image: `yourdockerhub/modelclone-worker:latest`
- Network Volume: attach your volume
- GPU: RTX 4090 or A100 recommended (needs ~20GB VRAM)
- Endpoint ID will be used in `RUNPOD_ENDPOINT_ID` env var

### 4. All Models Auto-Downloaded
ALL models are auto-downloaded to the network volume on first worker boot:
- `pornworksRealPorn_Illustrious_v4_04.safetensors` (6.5GB checkpoint) → `/runpod-volume/models/checkpoints/`
- `z_image_turbo_bf16_nsfw_v2.safetensors` (12GB UNet) → `/runpod-volume/models/unet/`
- `qwen_3_4b.safetensors` (8GB CLIP) → `/runpod-volume/models/clip/`
- `ae.safetensors` (335MB VAE) → `/runpod-volume/models/vae/`

First boot takes ~10-15 minutes for downloads. Subsequent boots are fast (~30s).

## Required Model Layout on Network Volume
```
/runpod-volume/models/
├── checkpoints/
│   └── pornworksRealPorn_Illustrious_v4_04.safetensors  ← auto-downloaded
├── clip/
│   └── qwen_3_4b.safetensors                            ← auto-downloaded
├── vae/
│   └── ae.safetensors                                    ← auto-downloaded
├── unet/
│   └── z_image_turbo_bf16_nsfw_v2.safetensors           ← auto-downloaded
└── loras/
    └── (user LoRAs loaded dynamically via URL)
```

## Custom Nodes Included
- civitai/civitai_comfy_nodes
- kijai/ComfyUI-KJNodes
- ltdrdata/ComfyUI-Manager
- glifxyz/ComfyUI-GlifNodes
- Suzie1/ComfyUI_Comfyroll_CustomNodes
- chrisgoringe/cg-use-everywhere
- alexopus/ComfyUI-Image-Saver
- rgthree/rgthree-comfy
- WASasquatch/was-node-suite-comfyui
- **a-und-b/ComfyUI_LoRA_from_URL** ← Required for LoadLoraFromUrlOrPath nodes

## File Overview
| File | Purpose |
|------|---------|
| `Dockerfile` | Builds image: ComfyUI + nodes + deps |
| `start.sh` | Entrypoint: downloads models, starts ComfyUI, starts handler |
| `handler.py` | RunPod serverless handler (submits workflow, polls, returns base64) |
| `custom_nodes.list` | GitHub repos for custom nodes |
| `setup_custom_nodes.sh` | Clones custom nodes during build |
| `setup_models.sh` | Alternative: download models during build (for baked-in approach) |

## Workflow Design Notes
- Float values (LoRA strengths) are passed as **inline literals** directly in the LoadLoraFromUrlOrPath node inputs
- Do NOT use `PrimitiveFloat` or similar custom float nodes - they are not available in the Docker image
- The "Anything Everywhere" node (cg-use-everywhere) broadcasts CheckpointLoaderSimple outputs to refiner nodes

## Troubleshooting

### Worker starts but generations fail
1. Check worker logs for "[!!]" download failure warnings
2. Verify all 4 model files exist on network volume
3. Check ComfyUI startup logs for missing node errors
4. Send a debug request to check available nodes: `{"input": {"debug_nodes": true}}`
5. Handler now pre-validates all node class_types before submission for clearer error messages

### First boot is slow
Normal - downloading ~27GB of models. Check logs for download progress.

### 404 errors from RunPod API
The generation job completed but the result expired (>30 min). Check if ComfyUI is actually running.

### ComfyUI HTTP 500 errors
Usually caused by unknown node types in the workflow. The handler now validates nodes before submission and returns which specific node types are missing. Check the error response for details.
