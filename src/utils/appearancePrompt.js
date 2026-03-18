/**
 * Build a single descriptor string from model looks (single source of truth).
 * Supports full LoRA chip keys + legacy (gender, heritage, hairLength, hairTexture, faceType, style).
 * Custom text per category is supported (any string value).
 */
export function buildAppearanceDescriptor({ savedAppearance, age } = {}) {
  const appearance = savedAppearance && typeof savedAppearance === "object" ? savedAppearance : {};
  let normalizedAge = null;

  if (typeof age === "number" && Number.isFinite(age)) {
    normalizedAge = age;
  } else if (typeof age === "string" && age.trim()) {
    const parsed = parseInt(age, 10);
    if (!Number.isNaN(parsed)) {
      normalizedAge = parsed;
    }
  }

  const parts = [];
  if (appearance.gender) parts.push(String(appearance.gender));
  if (normalizedAge != null && normalizedAge >= 1 && normalizedAge <= 120) {
    parts.push(`${normalizedAge} years old`);
  }
  const heritage = appearance.heritage || appearance.ethnicity;
  if (heritage) parts.push(`${heritage} heritage`);
  if (appearance.skinTone) parts.push(appearance.skinTone);
  if (appearance.bodyType) parts.push(`${appearance.bodyType} body type`);
  if (appearance.height) parts.push(appearance.height);

  const hairParts = [appearance.hairLength, appearance.hairTexture, appearance.hairColor, appearance.hairType].filter(Boolean);
  if (hairParts.length > 0) {
    parts.push(`${hairParts.join(" ")} hair`);
  }

  if (appearance.eyeColor) parts.push(`${appearance.eyeColor} eyes`);
  if (appearance.eyeShape) parts.push(appearance.eyeShape);
  if (appearance.faceShape || appearance.faceType) parts.push(appearance.faceShape || appearance.faceType);
  if (appearance.noseShape) parts.push(appearance.noseShape);
  if (appearance.lipSize) parts.push(`${appearance.lipSize} lips`);
  if (appearance.breastSize) parts.push(appearance.breastSize);
  if (appearance.buttSize) parts.push(appearance.buttSize);
  if (appearance.waist) parts.push(appearance.waist);
  if (appearance.hips) parts.push(appearance.hips);
  if (appearance.tattoos) parts.push(appearance.tattoos);
  if (appearance.style) parts.push(`${appearance.style} style`);

  return parts.join(", ");
}

export function buildAppearancePrefix(options = {}) {
  const appearanceText = buildAppearanceDescriptor(options);
  return appearanceText ? `Subject appearance: ${appearanceText}. ` : "";
}
