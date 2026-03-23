/**
 * Multi-reference Seedream-style prompts. Input order is always:
 *   images 1–3 = identity references (same person, model photos)
 *   image 4   = target / composition reference (pose, scene, and optionally outfit)
 *
 * Tuned for stronger likeness adherence and less identity bleed from image 4.
 */

/** Wardrobe from image 3 (third model photo); pose/scene from image 4. */
export const IDENTITY_RECREATE_MODEL_CLOTHES = [
  "Recreate the scene and composition of image 4, substituting the subject entirely with the person from images 1-3.",
  "Identity (absolute): The subject is exclusively defined by images 1-3. Lock and preserve: face shape, eyes, eyebrows, nose, lips, jawline, cheekbones, ears, skin tone, hairline, hair color, hair texture, and body type. Do not borrow, blend, or reference image 4's face, hair, skin tone, or body identity under any circumstance.",
  "Composition and scene (from image 4 only): Replicate body pose, limb placement, hand positioning, head angle, gaze direction, camera framing, crop, lens perspective, background, environment, props, and lighting direction exactly as they appear in image 4.",
  "Expression: Take the facial expression from image 4 and apply it onto the face from images 1-3. Do not copy the face - only the expression.",
  "Lighting: Match the lighting direction and quality from image 4. Adapt skin shading, highlights, and shadows naturally onto the subject's skin tone from images 1-3.",
  "Wardrobe: Copy clothing, footwear, jewelry, and accessories exactly as they appear in image 3. Do not use, reference, or blend any garments or accessories from image 4.",
  "Output rules: One subject only. One consistent face throughout. No identity morphing. No duplicated faces. No blended features between image 4 and images 1-3. No extra or missing limbs. Natural skin texture and anatomy throughout.",
  "Final output: One person, one face from images 1-3, wearing the outfit from image 3, placed precisely into the scene of image 4.",
].join(" ");

/** Wardrobe + full scene from image 4; identity still from 1-3. User text may be appended by the caller. */
export const IDENTITY_RECREATE_REFERENCE_CLOTHES = [
  "Recreate the scene and composition of image 4, substituting the subject entirely with the person from images 1-3.",
  "Image roles: Images 1, 2, and 3 are identity references of the same person - use them to lock one single consistent likeness. Image 4 defines pose, scene, composition, and wardrobe only. It must not define who the person is.",
  "Identity (absolute): The subject is exclusively defined by images 1-3. Lock and preserve: face shape, eyes, eyebrows, nose, lips, jawline, cheekbones, ears, skin tone, hairline, hair color, hair texture, body type, and limb proportions. Do not borrow, blend, or reference image 4's face, hair, skin tone, or body identity under any circumstance.",
  "Composition and scene (from image 4): Replicate body pose, limb placement, hand positioning, head angle, gaze direction, camera framing, crop, lens perspective, background, environment, and props exactly as they appear in image 4.",
  "Expression: Extract the facial expression from image 4 and apply it onto the face from images 1-3. Adapt the expression only - do not copy the face.",
  "Lighting: Match the lighting direction, intensity, and quality from image 4. Adapt skin shading, highlights, and shadows naturally to the subject's skin tone from images 1-3.",
  "Wardrobe: Copy clothing, footwear, jewelry, and all accessories exactly as they appear in image 4. Do not use or reference any garments or accessories from images 1-3.",
  "Output rules: One subject only. One consistent face throughout. No identity morphing. No blended features between image 4 and images 1-3. No duplicated faces. No extra or missing limbs. Natural skin texture and anatomy throughout.",
  "Final output: One person, one face and body from images 1-3, wearing the exact outfit and accessories from image 4, placed precisely into the scene of image 4.",
].join(" ");
