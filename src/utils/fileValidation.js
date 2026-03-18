const SUPPORTED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const SUPPORTED_VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov"]);

const SUPPORTED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const SUPPORTED_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/x-mp4",
  "video/webm",
  "video/quicktime",
]);

function getExtensionFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const pathname = new URL(url).pathname;
    const lastDot = pathname.lastIndexOf(".");
    if (lastDot === -1) return null;
    return pathname.substring(lastDot + 1).toLowerCase().split(/[?#]/)[0];
  } catch {
    return null;
  }
}

function validateImageUrl(url) {
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return { valid: false, message: "Invalid image URL provided." };
  }
  const ext = getExtensionFromUrl(url);
  if (ext && !SUPPORTED_IMAGE_EXTENSIONS.has(ext)) {
    const friendlyType = ext.toUpperCase();
    return {
      valid: false,
      message: `Unsupported image format: .${friendlyType}. Please upload a JPG, PNG, or WebP image.`,
    };
  }
  return { valid: true };
}

function validateVideoUrl(url) {
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return { valid: false, message: "Invalid video URL provided." };
  }
  const ext = getExtensionFromUrl(url);
  if (ext && !SUPPORTED_VIDEO_EXTENSIONS.has(ext)) {
    const friendlyType = ext.toUpperCase();
    return {
      valid: false,
      message: `Unsupported video format: .${friendlyType}. Please upload an MP4, WebM, or MOV video.`,
    };
  }
  return { valid: true };
}

function validateImageUrls(urls) {
  if (!Array.isArray(urls)) return { valid: false, message: "Expected an array of image URLs." };
  for (let i = 0; i < urls.length; i++) {
    const result = validateImageUrl(urls[i]);
    if (!result.valid) {
      return { valid: false, message: `Image ${i + 1}: ${result.message}` };
    }
  }
  return { valid: true };
}

export async function validateContentType(url, type = "image") {
  const supported = type === "video" ? SUPPORTED_VIDEO_MIMES : SUPPORTED_IMAGE_MIMES;
  const friendlyList = type === "video" ? "MP4, WebM, or MOV" : "JPG, PNG, or WebP";
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (contentType && !supported.has(contentType) && !contentType.startsWith("application/octet-stream")) {
      return {
        valid: false,
        message: `Unsupported ${type} format (${contentType}). Please upload a ${friendlyList} file.`,
      };
    }
    return { valid: true };
  } catch {
    return { valid: true };
  }
}

export {
  validateImageUrl,
  validateVideoUrl,
  validateImageUrls,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_VIDEO_EXTENSIONS,
};
