#!/bin/bash
set -e

echo "========================================="
echo "ModelClone ComfyUI Worker Starting..."
echo "========================================="

COMFYUI_DIR="/workspace/ComfyUI"
MODELS_DIR="${COMFYUI_DIR}/models"
VOLUME_DIR="/runpod-volume"
VOLUME_MODELS="${VOLUME_DIR}/models"

download_if_missing() {
    local url="$1"
    local dest="$2"
    local name="$(basename $dest)"

    if [ -f "$dest" ]; then
        echo "  [OK] Already exists: $name"
        return 0
    fi

    echo "  [DL] Downloading: $name ..."
    mkdir -p "$(dirname $dest)"
    if wget -q --show-progress -O "${dest}.tmp" "$url" 2>&1; then
        mv "${dest}.tmp" "$dest"
        echo "  [OK] Downloaded: $name ($(du -h "$dest" | cut -f1))"
    else
        echo "  [!!] FAILED to download: $name (will retry on next boot)"
        rm -f "${dest}.tmp"
    fi
}

setup_models() {
    local target_dir="$1"

    mkdir -p "${target_dir}/checkpoints"
    mkdir -p "${target_dir}/clip"
    mkdir -p "${target_dir}/vae"
    mkdir -p "${target_dir}/loras"
    mkdir -p "${target_dir}/diffusion_models"
    mkdir -p "${target_dir}/unet"

    echo ""
    echo "--- [1/4] VAE: ae.safetensors (335MB) ---"
    download_if_missing \
        "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors" \
        "${target_dir}/vae/ae.safetensors"

    echo ""
    echo "--- [2/4] CLIP: qwen_3_4b.safetensors (8GB) ---"
    download_if_missing \
        "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors" \
        "${target_dir}/clip/qwen_3_4b.safetensors"

    echo ""
    echo "--- [3/4] UNet: zImageTurboNSFW_43BF16AIO.safetensors (CivitAI) ---"
    if [ -f "${target_dir}/unet/zImageTurboNSFW_43BF16AIO.safetensors" ]; then
        echo "  [OK] Already exists: zImageTurboNSFW_43BF16AIO.safetensors"
    else
        echo "  [DL] Downloading from CivitAI (requires API key)..."
        mkdir -p "${target_dir}/unet"
        CIVITAI_URL="https://civitai.com/api/download/models/2682644?type=Model&format=SafeTensor&size=pruned&fp=fp16&token=${CIVITAI_API_KEY}"
        if wget -q --show-progress --content-disposition -O "${target_dir}/unet/zImageTurboNSFW_43BF16AIO.safetensors.tmp" "${CIVITAI_URL}" 2>&1; then
            mv "${target_dir}/unet/zImageTurboNSFW_43BF16AIO.safetensors.tmp" "${target_dir}/unet/zImageTurboNSFW_43BF16AIO.safetensors"
            echo "  [OK] Downloaded: zImageTurboNSFW_43BF16AIO.safetensors ($(du -h "${target_dir}/unet/zImageTurboNSFW_43BF16AIO.safetensors" | cut -f1))"
        else
            echo "  [!!] FAILED to download from CivitAI. Check CIVITAI_API_KEY env var."
            rm -f "${target_dir}/unet/zImageTurboNSFW_43BF16AIO.safetensors.tmp"
        fi
    fi
    if [ -f "${target_dir}/unet/zImageTurboNSFW_20BF16AIO.safetensors" ]; then
        echo "  [CLEANUP] Removing old v2.0 model..."
        rm -f "${target_dir}/unet/zImageTurboNSFW_20BF16AIO.safetensors"
    fi

    echo ""
    echo "--- [4/4] Checkpoint: pornworksRealPorn_Illustrious_v4_04.safetensors (6.5GB) ---"
    download_if_missing \
        "https://huggingface.co/AI-Porn/pornworks-real-porn-photo-realistic-nsfw-sdxl-and-pony-chekpoint/resolve/main/pornworksRealPorn_Illustrious_v4_04.safetensors" \
        "${target_dir}/checkpoints/pornworksRealPorn_Illustrious_v4_04.safetensors"
}

# -----------------------------------------------
# Set HuggingFace cache location
# Points at network volume so LLM downloads (JoyCaption) persist across reboots
# -----------------------------------------------
if [ -d "$VOLUME_DIR" ]; then
    export HF_HOME="${VOLUME_DIR}/hf_cache"
    mkdir -p "${HF_HOME}"
    echo ">>> Network volume found at $VOLUME_DIR"
    echo ">>> HF_HOME set to ${HF_HOME}"
    echo ">>> Downloading ComfyUI models to network volume (skipping existing)..."
    setup_models "${VOLUME_MODELS}"

    echo ""
    echo ">>> Symlinking network volume models into ComfyUI..."
    for subdir in checkpoints clip loras vae unet diffusion_models; do
        if [ -d "${VOLUME_MODELS}/$subdir" ]; then
            rm -rf "${MODELS_DIR}/$subdir"
            ln -sf "${VOLUME_MODELS}/$subdir" "${MODELS_DIR}/$subdir"
            echo "  [OK] Linked: $subdir"
        fi
    done
else
    export HF_HOME="/root/.cache/huggingface"
    mkdir -p "${HF_HOME}"
    echo ">>> No network volume — downloading models directly into ComfyUI..."
    setup_models "${MODELS_DIR}"
fi

# -----------------------------------------------
# Self-heal: ensure chflame163/ComfyUI_LayerStyle_Advance is installed
# The LayerUtility JoyCaption nodes (LoadJoyCaptionBeta1Model etc.) live here.
# This check runs at boot so even an old Docker image gets the right nodes.
# -----------------------------------------------
LAYERSTYLE_DIR="${COMFYUI_DIR}/custom_nodes/ComfyUI_LayerStyle_Advance"
echo ""
echo "--- Checking chflame163/ComfyUI_LayerStyle_Advance (JoyCaption nodes) ---"
if grep -qr "LoadJoyCaptionBeta1Model" "${LAYERSTYLE_DIR}" 2>/dev/null; then
    echo "  [OK] ComfyUI_LayerStyle_Advance already installed with JoyCaption nodes"
else
    echo "  [!!] JoyCaption nodes missing — installing chflame163/ComfyUI_LayerStyle_Advance..."
    rm -rf "${LAYERSTYLE_DIR}"
    git clone --depth 1 "https://github.com/chflame163/ComfyUI_LayerStyle_Advance.git" "${LAYERSTYLE_DIR}"
    if [ -f "${LAYERSTYLE_DIR}/requirements.txt" ]; then
        pip install -q --no-cache-dir -r "${LAYERSTYLE_DIR}/requirements.txt" || true
    fi
    pip install -q --no-cache-dir \
        "transformers>=4.45.0" accelerate sentencepiece protobuf \
        "huggingface-hub>=0.25.0" bitsandbytes peft einops || true
    echo "  [OK] ComfyUI_LayerStyle_Advance installed!"
fi

# -----------------------------------------------
# Download JoyCaption Beta1 LLM (required by imgtoprompt_api.json workflow)
# Model: fancyfeast/llama-joycaption-beta-one-hf-llava (~9GB)
# Stored in HF_HOME cache — skipped automatically if already present
# -----------------------------------------------
JOYCAPTION_MODEL_ID="fancyfeast/llama-joycaption-beta-one-hf-llava"
JOYCAPTION_MARKER="${HF_HOME}/hub/models--fancyfeast--llama-joycaption-beta-one-hf-llava/snapshots"

echo ""
echo "--- JoyCaption Beta1 LLM (${JOYCAPTION_MODEL_ID}, ~9GB) ---"
if [ -d "${JOYCAPTION_MARKER}" ]; then
    echo "  [OK] JoyCaption Beta1 already in HF cache — skipping download"
else
    echo "  [DL] Downloading JoyCaption Beta1 (this takes a few minutes)..."
    python3 - <<'PYEOF'
import sys, os
hf_home = os.environ.get("HF_HOME", "/root/.cache/huggingface")
os.environ["HF_HOME"] = hf_home
try:
    from huggingface_hub import snapshot_download
    path = snapshot_download("fancyfeast/llama-joycaption-beta-one-hf-llava")
    print(f"  [OK] JoyCaption Beta1 ready at: {path}")
except Exception as e:
    print(f"  [!!] JoyCaption download failed: {e}", file=sys.stderr)
    # Non-fatal: ComfyUI starts but the imgtoprompt workflow will fail at runtime
    sys.exit(0)
PYEOF
fi

echo ""
echo ">>> Model files available:"
find ${MODELS_DIR} -name "*.safetensors" -type f -o -name "*.safetensors" -type l 2>/dev/null | while read f; do
    echo "  $(du -h "$f" 2>/dev/null | cut -f1)  $(basename $f)"
done

echo ""
echo ">>> Starting ComfyUI on port 8188..."
cd ${COMFYUI_DIR}
LISTEN_ADDR="${COMFYUI_LISTEN:-0.0.0.0}"
echo ">>> Binding ComfyUI to ${LISTEN_ADDR}:8188"

# Export HF_HOME so ComfyUI and layerstyle can find the cached JoyCaption model
export HF_HOME="${HF_HOME}"

python3 main.py \
    --listen ${LISTEN_ADDR} \
    --port 8188 \
    --disable-auto-launch \
    --disable-metadata \
    &

COMFYUI_PID=$!
echo ">>> ComfyUI PID: ${COMFYUI_PID}"

echo ">>> Waiting for ComfyUI to be ready..."
MAX_WAIT=300
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://127.0.0.1:8188/system_stats > /dev/null 2>&1; then
        echo ">>> ComfyUI is READY! (took ${WAITED}s)"
        break
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    if [ $((WAITED % 20)) -eq 0 ]; then
        echo "  Still waiting... (${WAITED}s)"
    fi
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo ">>> ERROR: ComfyUI failed to start within ${MAX_WAIT}s"
    exit 1
fi

echo ">>> Starting RunPod serverless handler..."
cd /workspace
python3 handler.py
