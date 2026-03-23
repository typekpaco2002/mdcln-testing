import { getR2PublicUrl, hasR2Object } from "../utils/r2.js";

export const TUTORIAL_SLOTS = [
  { key: "models.my-models", label: "My Models" },
  { key: "generate.video.recreate", label: "Generate Content - Recreate Video" },
  { key: "generate.video.prompt", label: "Generate Content - Prompt Video" },
  { key: "generate.video.faceswap", label: "Generate Content - Face Swap Video" },
  { key: "generate.video.talking", label: "Generate Content - Talking Video" },
  { key: "creator.nanobanana-pro", label: "Creator Studio - Image Generation" },
  { key: "creator.voice-studio", label: "Creator Studio - Voice Studio" },
  { key: "creator.real-avatars", label: "Creator Studio - Real Avatars" },
  { key: "nsfw.training", label: "NSFW - Training" },
  { key: "nsfw.generate", label: "NSFW - Generate" },
  { key: "nsfw.video", label: "NSFW - Video" },
  { key: "nsfw.img2img", label: "NSFW - Img2Img" },
];

const TUTORIAL_SLOT_MAP = new Map(TUTORIAL_SLOTS.map((slot) => [slot.key, slot]));

export function isValidTutorialSlot(slotKey) {
  return TUTORIAL_SLOT_MAP.has(String(slotKey || "").trim());
}

export function getTutorialSlot(slotKey) {
  return TUTORIAL_SLOT_MAP.get(String(slotKey || "").trim()) || null;
}

export function getTutorialR2Key(slotKey) {
  const safeSlot = String(slotKey || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
  return `static/tutorials/${safeSlot}.mp4`;
}

export function getTutorialPublicUrl(slotKey) {
  return getR2PublicUrl(getTutorialR2Key(slotKey));
}

export async function getTutorialCatalog() {
  const entries = await Promise.all(
    TUTORIAL_SLOTS.map(async (slot) => {
      const r2Key = getTutorialR2Key(slot.key);
      const exists = await hasR2Object(r2Key);
      return {
        key: slot.key,
        label: slot.label,
        exists,
        url: exists ? getR2PublicUrl(r2Key) : null,
      };
    }),
  );

  const byKey = entries.reduce((acc, item) => {
    acc[item.key] = item;
    return acc;
  }, {});

  return { entries, byKey };
}
