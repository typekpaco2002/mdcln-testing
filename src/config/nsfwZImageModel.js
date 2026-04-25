/**
 * Basename of the UNet on the RunPod worker (`models/unet/`, e.g. volume + start.sh).
 * Refiner path uses the same UNET + CLIP + VAE as txt2img (no separate checkpoint bundle).
 * Optional: `NSFW_ZIMAGE_UNET_BASENAME` env (e.g. `zImageTurboNSFW_62BF16Diffusion.safetensors` if that is the file on disk).
 */
export const NSFW_ZIMAGE_UNET_BASENAME =
  (typeof process !== "undefined" && String(process.env?.NSFW_ZIMAGE_UNET_BASENAME || "").trim()) ||
  "zImageTurboNSFW_62BF16.safetensors";
