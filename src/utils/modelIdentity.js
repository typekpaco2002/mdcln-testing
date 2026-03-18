export function getModelReferenceUrls(model) {
  if (!model) return [];

  let params = null;
  const raw = model.aiGenerationParams;
  if (raw && typeof raw === "string") {
    try {
      params = JSON.parse(raw);
    } catch {
      params = null;
    }
  } else if (raw && typeof raw === "object") {
    params = raw;
  }

  const ref = params?.referenceUrl ?? params?.referenceUrls;
  if (typeof ref === "string" && ref.trim()) {
    return [ref.trim()];
  }
  if (Array.isArray(ref)) {
    return ref.filter((url) => typeof url === "string" && url.trim()).map((u) => u.trim());
  }
  return [];
}

export function buildIdentityImageList(model, { max = 4 } = {}) {
  const refs = getModelReferenceUrls(model);
  const photos = [model?.photo1Url, model?.photo2Url, model?.photo3Url].filter(Boolean);
  const combined = [...refs, ...photos].filter(Boolean);
  const unique = combined.filter((url, index, arr) => arr.indexOf(url) === index);
  return unique.slice(0, Math.max(0, max));
}
