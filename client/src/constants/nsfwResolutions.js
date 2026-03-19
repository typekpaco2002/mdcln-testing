/** Keep ids in sync with server `src/utils/nsfwResolution.js` NSFW_RESOLUTION_MAP */

export const NSFW_RESOLUTION_OPTIONS = [
  { id: "1344x768", label: "Landscape 16:9", size: "1344×768", hint: "Default" },
  { id: "768x1344", label: "Portrait 9:16", size: "768×1344", hint: "Vertical / phone" },
  { id: "1024x1024", label: "Square HD", size: "1024×1024", hint: "1:1" },
  { id: "1024x576", label: "Wide 16:9", size: "1024×576", hint: "Compact landscape" },
  { id: "576x1024", label: "Tall 9:16", size: "576×1024", hint: "Compact portrait" },
  { id: "1024x768", label: "Landscape 4:3", size: "1024×768", hint: "Classic" },
  { id: "768x1024", label: "Portrait 3:4", size: "768×1024", hint: "Classic vertical" },
  { id: "512x512", label: "Square", size: "512×512", hint: "Faster preview" },
];
