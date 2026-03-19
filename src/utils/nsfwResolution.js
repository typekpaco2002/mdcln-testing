/**
 * ComfyUI "CR SDXL Aspect Ratio" (node 50) preset strings + dimensions.
 * Keys must match client `NSFW_RESOLUTION_OPTIONS` ids.
 */
export const NSFW_RESOLUTION_MAP = {
  "1344x768": { width: 1344, height: 768, aspect_ratio: "16:9 landscape 1344x768" },
  "768x1344": { width: 768, height: 1344, aspect_ratio: "9:16 portrait 768x1344" },
  "1024x1024": { width: 1024, height: 1024, aspect_ratio: "1:1 square 1024x1024" },
  "1024x576": { width: 1024, height: 576, aspect_ratio: "16:9 landscape 1024x576" },
  "576x1024": { width: 576, height: 1024, aspect_ratio: "9:16 portrait 576x1024" },
  "1024x768": { width: 1024, height: 768, aspect_ratio: "4:3 landscape 1024x768" },
  "768x1024": { width: 768, height: 1024, aspect_ratio: "3:4 portrait 768x1024" },
  "512x512": { width: 512, height: 512, aspect_ratio: "1:1 square 512x512" },
};

const DEFAULT_KEY = "1344x768";

/**
 * @param {string | undefined} presetId - e.g. "1344x768"
 * @returns {{ width: number, height: number, aspect_ratio: string, presetId: string }}
 */
export function resolveNsfwResolution(presetId) {
  const key = presetId && NSFW_RESOLUTION_MAP[presetId] ? presetId : DEFAULT_KEY;
  const spec = NSFW_RESOLUTION_MAP[key];
  return { ...spec, presetId: key };
}
