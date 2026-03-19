/**
 * Multi-reference Seedream-style prompts. Input order is always:
 *   images 1–3 = identity references (same person, model photos)
 *   image 4   = target / composition reference (pose, scene, and optionally outfit)
 *
 * Tuned for stronger likeness adherence and less identity bleed from image 4.
 */

/** Wardrobe from image 3 (third model photo); pose/scene from image 4. */
export const IDENTITY_RECREATE_MODEL_CLOTHES = [
  "Generate one photorealistic output image.",
  "Image roles: Images 1, 2, and 3 are identity references of the SAME real person—use them together to lock one consistent face, hair, skin tone, facial proportions, and visible body traits.",
  "Image 4 is ONLY a composition and scene reference. It must NOT define who the person is.",
  "Identity (strict): The subject must be the person from images 1–3, not anyone in image 4. Match face shape, eyes, eyebrows, nose, lips, jawline, cheekbones, ears, skin tone, hairline, hair color, hair texture, and body type from 1–3. Do not copy image 4's face, hair, or skin identity.",
  "Pose and scene from image 4: Match body pose, limb and hand placement, head angle, gaze direction, facial expression, camera framing, crop, perspective, background, environment, props, and lighting direction from image 4 as closely as possible.",
  "Wardrobe: Copy clothing, footwear, jewelry, and accessories EXACTLY from image 3 (the third identity reference). Do not use or blend garments or accessories from image 4.",
  "Quality: Natural skin texture, consistent anatomy, one person only, no duplicated faces, no morphing between identities, no extra limbs.",
].join(" ");

/** Wardrobe + full scene from image 4; identity still from 1–3. User text may be appended by the caller. */
export const IDENTITY_RECREATE_REFERENCE_CLOTHES = [
  "Generate one photorealistic output image.",
  "Image roles: Images 1, 2, and 3 are identity references of the SAME person—lock a single consistent likeness from them.",
  "Image 4 defines pose, scene, outfit, and styling.",
  "Identity (strict): The subject must be the person from images 1–3 only. Match facial structure, eyes, nose, mouth, jaw, skin tone, hairline, and hair from 1–3. Do not preserve image 4's facial identity, hair, or skin tone.",
  "Scene and wardrobe from image 4: Replicate body pose, hands, expression, framing, background, lighting, clothing, jewelry, accessories, and any visible styling from image 4.",
  "Quality: Natural skin texture, consistent anatomy, one person only, no identity drift toward image 4.",
].join(" ");
