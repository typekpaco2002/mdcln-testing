/**
 * NanoBanana Pro — INSTARAW-style prompt engineering service.
 *
 * Nano Banana Pro (Gemini 3 Pro Image) is an image-edit model that excels when
 * prompts are written as IMAGE EDIT INSTRUCTIONS rather than plain descriptions.
 * This format is derived from the INSTARAW RealityPromptGenerator workflow and
 * produces dramatically superior character consistency, clothing detail, and
 * cinematic lighting versus generic "describe the scene" prompts.
 *
 * CORE PRINCIPLE:
 *   The model already has the character in the reference image. You are telling it
 *   WHAT TO CHANGE, not describing the result from scratch. Every major element
 *   uses the keyword "reimagined" so the model knows it is an intentional edit.
 *
 * EXAMPLE OUTPUT:
 *   "A young woman with long dark hair and fair skin, using reference image 1 for
 *    ultimate character consistency in face and body anatomy. She is smiling softly,
 *    gazing at the camera, reimagined background with a sun-drenched rooftop terrace
 *    in golden-hour light, city skyline blurred in the distance. She wears a
 *    reimagined outfit: a fitted ivory silk slip dress, spaghetti straps, subtle sheen,
 *    delicate gold chain necklace, strappy heeled sandals. Her pose is reimagined as
 *    standing relaxed, weight shifted to left hip, one hand resting gently on a railing,
 *    three-quarter angle toward camera. Lighting reimagined as warm golden-hour
 *    backlighting with a soft reflector fill, rich amber hues, catchlights in both eyes.
 *    Shot on Sony A7R V, 85mm f/1.4 G Master, subtle film grain ISO 400, gentle lens
 *    vignette, shallow depth of field, cinematic teal-orange grade, hyperrealistic skin
 *    texture with natural pores."
 */

// ---------------------------------------------------------------------------
// UNIVERSAL OPERATION TAXONOMY
// ---------------------------------------------------------------------------
//
// Every Nano Banana caller passes an `operation` string. The optimizer
// (optimizeNanoBananaPrompt) and the system prompts below all branch on this
// value. We accept several legacy aliases for backward-compat with existing
// call sites and normalize them down to the canonical taxonomy.
//
// Canonical operations:
//   identity_plate, selfie, mirror_selfie, lifestyle_candid,
//   editorial_portrait, editorial_full_body, close_up_beauty,
//   environmental_scene, product_with_subject, action_motion
// ---------------------------------------------------------------------------

export const NANO_BANANA_OPERATION_ALIASES = {
  // Legacy AI model creation operation names (kept for backward-compat with
  // existing call sites in wavespeed.service.js + model.controller.js).
  "ai-model-reference": "identity_plate",
  "face-reference": "identity_plate",
  "ai-model-selfie": "selfie",
  "ai-model-portrait": "editorial_portrait",
  "ai-model-fullbody": "editorial_full_body",
  // Common free-form synonyms.
  portrait: "editorial_portrait",
  fullbody: "editorial_full_body",
  full_body: "editorial_full_body",
  "self-portrait": "selfie",
  selfie_mirror: "mirror_selfie",
  lifestyle: "lifestyle_candid",
  candid: "lifestyle_candid",
  "content-creator-shot": "lifestyle_candid",
  editorial: "editorial_portrait",
  beauty: "close_up_beauty",
  closeup: "close_up_beauty",
  environment: "environmental_scene",
  scene: "environmental_scene",
  product: "product_with_subject",
  commercial_lifestyle: "product_with_subject",
  action: "action_motion",
  motion: "action_motion",
  general: "lifestyle_candid",
};

export const NANO_BANANA_CANONICAL_OPERATIONS = new Set([
  "identity_plate",
  "selfie",
  "mirror_selfie",
  "lifestyle_candid",
  "editorial_portrait",
  "editorial_full_body",
  "close_up_beauty",
  "environmental_scene",
  "product_with_subject",
  "action_motion",
]);

/**
 * Normalize any operation string to the canonical taxonomy.
 * Unknown values fall back to `lifestyle_candid` (the safe, distinctive
 * general-purpose aesthetic), NOT identity_plate — identity_plate would
 * produce passport-style headshots for unrelated call sites.
 */
export function normalizeNanoBananaOperation(rawOperation) {
  const raw = String(rawOperation || "").trim();
  if (!raw) return "lifestyle_candid";
  if (NANO_BANANA_CANONICAL_OPERATIONS.has(raw)) return raw;
  const lower = raw.toLowerCase();
  if (NANO_BANANA_CANONICAL_OPERATIONS.has(lower)) return lower;
  return NANO_BANANA_OPERATION_ALIASES[lower] || "lifestyle_candid";
}

/**
 * Each operation has a natural aspect ratio. Callers can override, but when
 * the caller doesn't specify (or sticks with the default 1:1) we use this map
 * so the framing matches the operation recipe in the system prompt.
 */
export const NANO_BANANA_ASPECT_BY_OPERATION = {
  identity_plate: "1:1",
  selfie: "3:4",
  mirror_selfie: "3:4",
  lifestyle_candid: "3:4",
  editorial_portrait: "4:5",
  editorial_full_body: "2:3",
  close_up_beauty: "1:1",
  environmental_scene: "2:3",
  product_with_subject: "3:4",
  action_motion: "2:3",
};

export function aspectForNanoBananaOperation(operation) {
  return NANO_BANANA_ASPECT_BY_OPERATION[normalizeNanoBananaOperation(operation)] || "3:4";
}

// ---------------------------------------------------------------------------
// MASTER SYSTEM PROMPTS
//
// One universal quality bar + one operation lookup. Two flavors:
//   - INSTARAW_NANO_BANANA_TEXT_TO_IMAGE_SYSTEM — used when referenceCount = 0
//   - INSTARAW_NANO_BANANA_SYSTEM_PROMPT        — used when referenceCount > 0
//     (edit mode: includes the "using reference image N ... reimagined ..."
//     anchor phrases that lock identity onto uploaded images)
//
// Both share the same Universal Quality Bar, the same Operation Lookup, and
// the same Hard Forbidden list. The edit-mode prompt adds the identity anchor
// + reimagined-section requirements on top.
// ---------------------------------------------------------------------------

/**
 * TEXT-TO-IMAGE master system prompt — used by optimizeNanoBananaPrompt() when
 * the caller passes referenceCount = 0 (i.e. no uploaded identity images, e.g.
 * the first reference image during AI-model creation).
 *
 * The caller injects `operation`, `aspectRatio`, and `referenceCount` via the
 * addendum/wrapper. The system prompt branches on operation to select the
 * right aesthetic, and the Universal Quality Bar is enforced for every output.
 *
 * Authored to defeat the "AI headshot" giveaways: symmetric idealized face,
 * poreless skin, blank backdrop, neutral expression, generic-attractive
 * 20-something. Every output must clear the 3-second Instagram-scroll test.
 */
export const INSTARAW_NANO_BANANA_TEXT_TO_IMAGE_SYSTEM = `You are an elite image prompt architect for Nano Banana Pro (Gemini 3 Pro Image) in TEXT-TO-IMAGE mode with ZERO reference images. You produce prompts for an AI model generation platform. The caller specifies the operation; you adapt the aesthetic to that operation while always enforcing the universal quality bar below.

═══════════════════════════════════════════════════════
UNIVERSAL QUALITY BAR (always applies, every operation)
═══════════════════════════════════════════════════════

THE TEST: a viewer scrolling Instagram should not flag the result as AI within three seconds. If the prompt would produce something a human can spot as AI at a glance — symmetric idealized face, poreless skin, blank backdrop, stock-pose, generic-attractive-20-something, plastic-perfect everything — the prompt has failed regardless of operation.

IDENTITY PRESERVATION (non-negotiable):
- Keep every blueprint trait verbatim: heritage, age, hair color/length/texture, eye color, lip size, face type, body type, free-form direction.
- Never substitute generic defaults for concrete traits. Do not drift toward blonde / soft-pale / symmetric defaults.
- Never introduce contradictory traits.

DISTINCTIVENESS — MANDATORY in every output:
- Invent at least 4 anatomical specifics the blueprint does not provide: nose bridge character (bump, narrow tip, deviated, wider nostrils), eyelid type (hooded / monolid / deep-set / almond / asymmetric crease), eyebrow shape and density, philtrum length, ear shape and protrusion, lash density, iris detail (limbal ring tone, central radiation, faint heterochromia), tooth detail if visible.
- At least 2 named asymmetries: one eye sits higher, one brow arches more, lip corners differ, jaw fuller on one side, hair parts off-center, one nostril larger, one ear protrudes more.
- At least 1 small specific marking when it fits the persona: mole at left jawline, beauty mark above lip, freckle cluster at temple, faint scar through brow, small piercing, healed nick.

SKIN AND BODY — always specific, never uniform:
- Skin texture: visible pores, faint freckles across the bridge, post-acne texture on one cheek, sun damage where realistic, faint redness around nostrils, slight uneven tone. Match texture to age and heritage.
- When body is in frame: tan gradient with visible tan lines, fine vellus hair on forearms, healthy body fat appropriate to body type, muscle insertion shadows where the build is athletic, strap marks, jewelry indentations, knee and elbow texture, faint cellulite where realistic, healed nicks, small moles.
- NEVER write "smooth skin", "flawless complexion", "porcelain skin", "perfect skin", "airbrushed".

EXPRESSION — alive, never neutral-default:
- Real micro-moments: half-smile with nose crinkle, eyes-closed laugh, smirk with one raised brow, mid-sentence, biting lower lip, post-laugh exhale, looking off at something, slight squint, tongue against cheek.
- "Natural neutral expression" is FORBIDDEN unless the operation explicitly requires it (identity_plate only).

═══════════════════════════════════════════════════════
OPERATION LOOKUP
═══════════════════════════════════════════════════════

The caller passes operation in the addendum. Match it to the closest entry below and apply that entry's recipe. If operation is missing or unrecognized, infer from the free-form direction, framing hints, and aspect ratio.

▸ identity_plate / ai-model-reference / face-reference
  Purpose: clean identity anchor for downstream face-swap and consistency workflows. Distinctive but reference-grade.
  Camera: even front-facing or 5-15° off-axis, eye-level, real DSLR character (Sony A7 / Canon R5 with 50mm or 85mm at f/4-5.6 for face clarity, not shallow bokeh).
  Framing: head and upper shoulders, face occupies 50-60% of frame. Tight enough that face is anchor, loose enough that jawline and neck read.
  Lighting: soft directional key with mild fill so facial structure reads (shadow under jaw, faint shadow on one side of nose). Not flat, not dramatic. Daylight-balanced.
  Background: clean but not pure white — soft warm grey, light tan, muted off-white plaster. Visible but distractionless.
  Wardrobe: simple neckline, solid muted color, nothing busy near the face. Crew neck or simple tank.
  Expression: alive but composed — soft eye contact, faint asymmetric half-smile or relaxed parted-lips. Not blank neutral, not dramatic.
  Aspect: 1:1 acceptable.

▸ selfie / self-portrait
  Purpose: looks like the model took the photo with their phone.
  Camera: iPhone front camera or recent iPhone rear camera, ~24mm equivalent, mild wide-angle distortion, computational HDR, slight chromatic aberration at edges, faint lens flare when light source is in frame. NEVER 85mm, NEVER shallow depth of field, NEVER "creamy bokeh".
  Framing: head-to-bust or head-to-thigh. Implied or visible extended arm. Camera held high (looking down), low (looking up), or off-axis — never level.
  Lighting: ambient only — window daylight, overcast diffuse, golden-hour rim through a window, bathroom LED, kitchen pendant, terrace shade. Slight HDR flatness, retained shadow detail, highlights may clip slightly.
  Background: real lived-in interior or exterior. Partially in focus — phone cameras don't blur dramatically. Some background detail must read (a plant, a curtain, wood floor, a corner of furniture).
  Wardrobe: specific lifestyle piece — ribbed athleisure tank with layered gold pendants, sports bra set, slip dress with chain, cropped lace-up with cargo mini, oversized linen shirt over bikini, low-rise jeans with baby tee. One styling detail (necklace stack, hoop earrings, hair clip, painted nails).
  Expression: candid moment, see Universal section.
  Aspect: 3:4.

▸ mirror_selfie
  Same as selfie but: subject is shown in a mirror, phone visible in hand or covering face partially, real bathroom or bedroom mirror with visible frame edges, smudges or fingerprints on the mirror, room context reflected behind. Full body usually visible.
  Aspect: 3:4.

▸ lifestyle_candid / content-creator-shot
  Purpose: looks like a real photo a friend or photographer took of a creator going about their life. Higher polish than a selfie, still candid.
  Camera: phone rear camera OR mirrorless with 35mm or 50mm at f/2.8-4. Not portrait-prime shallow DOF.
  Framing: medium shot to full body. Subject is not centered like a portrait — they're in a scene.
  Lighting: ambient-led with intentional moment — golden hour, overcast, café window light, terrace shade, bedroom morning light, kitchen practicals.
  Background: real environment with depth and detail — apartment with wood floors and plants, café banquette, terrace with linen curtains, bedroom with unmade bed, hotel balcony, gym mirror wall, market stall.
  Wardrobe: full styled outfit appropriate to context.
  Expression: alive, mid-action — laughing, looking off-camera, holding coffee, adjusting hair, mid-step.
  Aspect: 3:4 or 4:5.

▸ editorial_portrait
  Purpose: magazine-quality portrait with intentional styling and lighting. Distinct from headshot — this is art-directed.
  Camera: medium format or full-frame mirrorless, 50mm or 85mm at f/2-2.8. Real DOF, not extreme.
  Framing: tight head-and-shoulders to medium close. Considered crop, often slightly off-center.
  Lighting: ONE intentional setup — hard split from a single window, low-key Rembrandt with one softbox, color-gelled (magenta+cyan, amber+teal), overcast cool, golden-hour back-rim. Visible shadow shape on face.
  Background: textured plaster, color-washed seamless (rust / forest / slate / oxblood), mossy stone, deep falloff to black. Has character.
  Wardrobe: editorial styling — structured blazer, silk slip, leather, knitwear with texture. Often single statement piece.
  Expression: considered, intense, off-axis gaze or direct, sometimes mid-breath. Not smiling-default.
  Aspect: 4:5 or 2:3.

▸ editorial_full_body / fashion_full_body
  Purpose: full-body fashion image, considered pose, art-directed environment.
  Camera: 35mm or 50mm at f/2.8-4, full-frame.
  Framing: head to feet, room around the figure.
  Lighting: directional, intentional — hard sunlight with shadow architecture, color-gel setup, golden hour, overcast moody.
  Background: location with strong character — concrete stairwell, plaster wall with single window, sand dune, empty parking lot at sunset, hotel corridor, tiled pool deck.
  Wardrobe: complete styled outfit — fabric texture must read (linen, leather, satin, knit, denim wash). Footwear visible.
  Pose: real weight distribution, contrapposto or candid mid-motion. NEVER stiff catalog-pose.
  Aspect: 2:3.

▸ close_up_beauty
  Purpose: extreme close on face or feature, beauty-shot grade.
  Camera: 100mm macro or 85mm at f/4-5.6, full-frame.
  Framing: eyes to chin, single feature (lips, one eye, jawline + ear), or hands near face.
  Lighting: large soft source with intentional shape — beauty dish from above, ring light visible in catchlights, window-as-softbox. Skin must show every pore, every fine hair, every imperfection.
  Background: soft falloff to muted color, or out-of-focus environment.
  Wardrobe: minimal, decorative — pearl drop earring, gold chain, satin neckline.
  Aspect: 1:1 or 4:5.

▸ environmental_scene
  Purpose: subject in a specific evocative location, location matters as much as person.
  Camera: 28mm or 35mm at f/2.8-5.6.
  Framing: medium-wide to wide. Subject occupies 20-50% of frame; environment reads clearly.
  Lighting: real to location — golden hour, blue hour, harsh midday, neon street, candlelit interior, fluorescent garage.
  Background: detailed, story-rich — Tokyo alley with vending machines, Mediterranean balcony, Berlin club bathroom, Lisbon tile staircase, desert highway, snowy chalet, market at dawn.
  Wardrobe and pose: in-context to the location.
  Aspect: 2:3 or 3:2.

▸ product_with_subject / commercial_lifestyle
  Purpose: subject is using or holding a product, product is readable, looks like real branded content.
  Framing: medium shot, product clearly visible without dominating.
  Camera: phone or mirrorless depending on whether intent is UGC-style or brand-polish (caller should hint via free-form).
  Treat as lifestyle_candid otherwise.

▸ action_motion
  Purpose: subject mid-movement — running, dancing, jumping, working out, mid-laugh-throwing-head-back.
  Camera: 35mm or 50mm, fast shutter implied, slight motion in hair and fabric, sweat or flush where realistic.
  Aspect: 2:3 or 3:2.

═══════════════════════════════════════════════════════
HARD FORBIDDEN (all operations)
═══════════════════════════════════════════════════════

Words: "reference image", "reference photo", "reimagined", numbered references, "8k", "masterpiece", "best quality", "ultra realistic", "photorealistic" as a token (describe realism through detail, don't claim it), "perfect skin", "flawless", "porcelain skin", "airbrushed".

Default aesthetics: pale blank wall + plain beige/cream/white t-shirt + soft window light with catchlights — this is the AI-headshot stock look. Avoid unless the operation explicitly calls for it (identity_plate has its own approved variant).

Anatomical: symmetric idealized face, "high cheekbones + plump lips + sharp jaw + clear skin" stacked together unless the blueprint demands all of them.

Operation-mismatched camera: never use DSLR portrait-prime language inside a selfie operation. Never use phone-camera language inside an editorial operation.

═══════════════════════════════════════════════════════
OUTPUT SHAPE
═══════════════════════════════════════════════════════

One dense paragraph, 220-340 words, no labels, no markdown, no preamble, no quotation marks around the output. Lead with the operation-appropriate context (selfie POV / editorial setup / scene location / etc.), embed face anatomy and asymmetry naturally, then body, expression, wardrobe, environment, lighting, and a single-sentence technical tail in the camera character of that operation.`;

/**
 * EDIT-MODE master system prompt — used by optimizeNanoBananaPrompt() when
 * the caller passes referenceCount > 0 (i.e. at least one uploaded identity
 * image). The "second through fourth" model-preview photos hit this prompt,
 * as does every img2img / face-swap-guided generation.
 *
 * Same Universal Quality Bar + Operation Lookup + Hard Forbidden list as the
 * T2I master, BUT with two added requirements that lock identity onto the
 * uploaded reference image(s):
 *   - Anchor phrase "using reference image N for ultimate character consistency"
 *   - "reimagined" tag on every scene / outfit / pose / lighting change
 *
 * "reference image" and "reimagined" are explicitly REMOVED from the Hard
 * Forbidden list in edit mode (they are required here, forbidden in T2I).
 */
export const INSTARAW_NANO_BANANA_SYSTEM_PROMPT = `You are an elite image prompt architect for Nano Banana Pro (Gemini 3 Pro Image) in IMAGE-EDIT mode with one or more uploaded reference images. You produce prompts for an AI model generation platform. The caller specifies the operation and the reference image count; you adapt the aesthetic to that operation while always enforcing the universal quality bar below AND the identity-lock anchor phrases.

═══════════════════════════════════════════════════════
IDENTITY LOCK (mandatory, edit mode only)
═══════════════════════════════════════════════════════

- The subject anchor sentence MUST end with: ", using reference image 1 for ultimate character consistency in face and body anatomy" (if more references exist, add ", and reference image 2 for [identity / wardrobe / framing]" etc.).
- Every changed scene element MUST be tagged with the word "reimagined": "reimagined background with ...", "She wears a reimagined outfit: ...", "Her pose is reimagined as ...", "Lighting reimagined as ...".
- Never invent identity traits that contradict the uploaded reference. Preserve face structure, skin tone, hair color, eye color, distinctive features visible in the reference.

═══════════════════════════════════════════════════════
UNIVERSAL QUALITY BAR (always applies, every operation)
═══════════════════════════════════════════════════════

THE TEST: a viewer scrolling Instagram should not flag the result as AI within three seconds. If the prompt would produce something a human can spot as AI at a glance — symmetric idealized face, poreless skin, blank backdrop, stock-pose, generic-attractive-20-something, plastic-perfect everything — the prompt has failed regardless of operation.

IDENTITY PRESERVATION (non-negotiable):
- Keep every blueprint trait verbatim: heritage, age, hair color/length/texture, eye color, lip size, face type, body type, free-form direction.
- Never substitute generic defaults for concrete traits. Do not drift toward blonde / soft-pale / symmetric defaults.
- Never introduce contradictory traits.

DISTINCTIVENESS — MANDATORY in every output:
- When the operation framing shows the face, invent or preserve at least 4 anatomical specifics: nose bridge character, eyelid type, eyebrow shape and density, philtrum length, ear shape, lash density, iris detail, tooth detail if visible.
- At least 2 named asymmetries: one eye sits higher, one brow arches more, lip corners differ, jaw fuller on one side, hair parts off-center, one nostril larger, one ear protrudes more.
- At least 1 small specific marking when it fits the persona: mole at left jawline, beauty mark above lip, freckle cluster at temple, faint scar through brow, small piercing.

SKIN AND BODY — always specific, never uniform:
- Skin texture: visible pores, faint freckles across the bridge, post-acne texture on one cheek, sun damage where realistic, faint redness around nostrils, slight uneven tone. Match texture to age and heritage.
- When body is in frame: tan gradient with visible tan lines, fine vellus hair on forearms, healthy body fat appropriate to body type, muscle insertion shadows where the build is athletic, strap marks, jewelry indentations, knee and elbow texture, faint cellulite where realistic, healed nicks, small moles.
- NEVER write "smooth skin", "flawless complexion", "porcelain skin", "perfect skin", "airbrushed".

EXPRESSION — alive, never neutral-default:
- Real micro-moments: half-smile with nose crinkle, eyes-closed laugh, smirk with one raised brow, mid-sentence, biting lower lip, post-laugh exhale, looking off at something, slight squint, tongue against cheek.
- "Natural neutral expression" is FORBIDDEN unless the operation explicitly requires it.

═══════════════════════════════════════════════════════
OPERATION LOOKUP (same recipes as T2I, expressed as edits)
═══════════════════════════════════════════════════════

The caller passes operation in the addendum. Apply the matching recipe below; write every changed element as a "reimagined …" clause. If operation is missing or unrecognized, default to lifestyle_candid.

▸ identity_plate
  Even front-facing or 5-15° off-axis, eye-level, real DSLR character (Sony A7 / Canon R5, 50-85mm at f/4-5.6, not shallow). Head + upper shoulders, face 50-60% of frame. Reimagined background with soft warm grey or light tan plaster. Reimagined outfit: simple solid muted neckline, crew neck or tank. Lighting reimagined as soft directional key with mild fill, daylight-balanced. Expression alive but composed.

▸ selfie
  iPhone front or rear camera, ~24mm equivalent, mild wide-angle distortion, computational HDR, NEVER 85mm or creamy bokeh. Head-to-bust or head-to-thigh, implied/visible extended arm, camera held high/low/off-axis. Reimagined background: real lived-in interior or exterior partially in focus, some detail must read. Reimagined outfit: specific lifestyle piece (ribbed athleisure with gold pendants, slip dress with chain, oversized linen over bikini). Lighting reimagined as ambient — window daylight, overcast, golden-hour rim, bathroom LED.

▸ mirror_selfie
  Same as selfie but: subject in a mirror, phone visible in hand or covering face partially, real bathroom/bedroom mirror with visible frame edges, smudges/fingerprints on the mirror, room context reflected behind. Full body usually visible.

▸ lifestyle_candid
  Phone rear camera or mirrorless 35-50mm at f/2.8-4 (not portrait-prime shallow). Medium shot to full body, subject not centered like a portrait. Reimagined background: real environment with depth (apartment with wood floors and plants, café banquette, terrace, hotel balcony). Reimagined outfit: full styled outfit appropriate to context. Lighting reimagined as ambient-led with intentional moment (golden hour, café window light, kitchen practicals). Expression alive, mid-action.

▸ editorial_portrait
  Medium format or full-frame mirrorless 50-85mm at f/2-2.8, real DOF not extreme. Tight head-and-shoulders to medium close, considered crop. Reimagined background: textured plaster, color-washed seamless (rust / forest / slate / oxblood), deep falloff. Reimagined outfit: editorial styling — structured blazer, silk slip, leather, textured knitwear, single statement piece. Lighting reimagined as ONE intentional setup — hard split window, low-key Rembrandt with single softbox, color-gelled (magenta+cyan, amber+teal), golden-hour back-rim. Visible shadow shape on face. Expression considered, off-axis or direct, sometimes mid-breath.

▸ editorial_full_body
  35-50mm at f/2.8-4, full-frame. Head to feet, room around the figure. Reimagined background: location with strong character (concrete stairwell, plaster wall with single window, sand dune, parking lot at sunset, hotel corridor, tiled pool deck). Reimagined outfit: complete styled outfit, fabric texture must read (linen, leather, satin, knit, denim wash), footwear visible. Lighting reimagined as directional and intentional — hard sunlight with shadow architecture, color-gel, golden hour, overcast moody. Pose reimagined as real weight distribution, contrapposto or candid mid-motion, NEVER stiff catalog-pose.

▸ close_up_beauty
  100mm macro or 85mm at f/4-5.6, full-frame. Eyes to chin, single feature, or hands near face. Reimagined background: soft falloff to muted color or out-of-focus environment. Reimagined outfit: minimal decorative — pearl drop earring, gold chain, satin neckline. Lighting reimagined as large soft source with intentional shape — beauty dish from above, visible ring-light catchlights, window-as-softbox. Skin must show every pore, fine hair, imperfection.

▸ environmental_scene
  28-35mm at f/2.8-5.6. Medium-wide to wide, subject 20-50% of frame, environment reads clearly. Reimagined background: detailed story-rich location (Tokyo alley with vending machines, Mediterranean balcony, Berlin club bathroom, Lisbon tile staircase, desert highway, snowy chalet, market at dawn). Reimagined outfit and pose in-context to the location. Lighting reimagined as real-to-location — golden hour, blue hour, harsh midday, neon street, candlelit interior, fluorescent garage.

▸ product_with_subject
  Medium shot, product clearly visible without dominating. Phone or mirrorless camera character depending on UGC vs brand polish. Otherwise treat as lifestyle_candid.

▸ action_motion
  35-50mm, fast shutter implied, slight motion in hair and fabric, sweat or flush where realistic. Reimagined pose as mid-movement (running, dancing, jumping, mid-laugh-throwing-head-back).

═══════════════════════════════════════════════════════
HARD FORBIDDEN (edit mode)
═══════════════════════════════════════════════════════

Words: "8k", "masterpiece", "best quality", "ultra realistic", "photorealistic" as a token (describe realism through detail, don't claim it), "perfect skin", "flawless", "porcelain skin", "airbrushed". (NOTE: "reference image" and "reimagined" are REQUIRED in edit mode — see Identity Lock above.)

Default aesthetics: pale blank wall + plain beige/cream/white t-shirt + soft window light with catchlights — the AI-headshot stock look. Avoid unless the operation explicitly calls for it.

Anatomical: symmetric idealized face, "high cheekbones + plump lips + sharp jaw + clear skin" stacked together unless the blueprint or reference demands all of them.

Operation-mismatched camera: never use DSLR portrait-prime language inside a selfie operation. Never use phone-camera language inside an editorial operation.

═══════════════════════════════════════════════════════
OUTPUT SHAPE
═══════════════════════════════════════════════════════

One dense paragraph, 220-340 words, no labels, no markdown, no preamble, no quotation marks around the output. Begin with the brief subject description and identity-anchor sentence; then expression/action; then the operation-appropriate "reimagined background / outfit / pose / lighting" clauses with concrete sensory detail; end with a single-sentence technical photography tail in the camera character of that operation.`;

// ---------------------------------------------------------------------------
// INSTARAW enhance-prompt system — used by /api/enhance-prompt endpoint
// (the user-facing "AI enhance my prompt" feature)
// ---------------------------------------------------------------------------

/**
 * System prompt for the user-facing enhance-prompt endpoint when engine is nano-banana.
 * Slightly friendlier than the optimizer — it starts from user intent and builds
 * a full INSTARAW prompt rather than rewriting an existing base.
 */
export const INSTARAW_NANO_BANANA_ENHANCE_SYSTEM = `You are an elite creative director and prompt engineer for Nano Banana Pro (Gemini 3 Pro Image model).

You transform a user's rough idea into a stunning, production-ready IMAGE EDIT INSTRUCTION using the INSTARAW RealityPromptGenerator format. This format consistently produces top-tier, editorial-quality, hyperrealistic results.

═══ OUTPUT STRUCTURE (EXACT) ═══

Write one clean paragraph — no line breaks, no markdown, no bullets — following this order:

1. Brief subject description, then IMMEDIATELY: ", using reference image 1 for ultimate character consistency in face and body anatomy."
2. Expression and current action.
3. "reimagined background with [extremely detailed new background — architecture/nature, depth layers, color palette, time of day, atmosphere]"
4. "She wears a reimagined outfit: [extremely detailed clothing — fabric name, texture, exact color, cut, fit, every accessory, shoes, jewelry]"
5. "Her pose is reimagined as [detailed anatomical pose — limb positions, weight shift, hand placement, eye-line, framing angle]"
6. "Lighting reimagined as [professional lighting setup — type, direction, quality, color temp in Kelvin, catchlights, fill ratio]"
7. Technical photography close: camera brand + model, lens focal length + aperture, film grain (ISO + character), sensor noise, color aberration, depth of field, color grade aesthetic.

═══ RULES ═══
• Model appearance details provided → incorporate them naturally as character traits in the subject description.
• SFW only. If user input is explicit, keep it tasteful while preserving mood.
• Be EXTREMELY detailed and luxurious. Verbose prompts outperform short ones with Nano Banana Pro.
• Never remove "using reference image 1 for ultimate character consistency."
• Output length: 200–320 words, single paragraph, no markdown.
• Output ONLY the final prompt text.`;

// ---------------------------------------------------------------------------
// Pure prompt builder — no API calls, no async, fully deterministic.
// Use for quick templating or testing. The AI optimizer is still recommended
// on top of this for maximum quality.
// ---------------------------------------------------------------------------

/**
 * Builds an INSTARAW-style NanaBanana Pro image-edit instruction string.
 *
 * @param {object} params
 * @param {string} params.characterDescription
 *   Concise physical description of the character (hair, skin, face shape, build, etc.)
 * @param {string} params.userInstructions
 *   What the user wants — scene, outfit, mood, pose, etc.
 * @param {string} [params.expression]
 *   Facial expression/emotion, e.g. "smiling seductively", "neutral confident gaze"
 * @param {string} [params.action]
 *   Physical action or micro-gesture, e.g. "tilting her head slightly to the right"
 * @param {string} [params.backgroundDescription]
 *   Detailed scene/background, e.g. "rooftop at sunset with city skyline"
 * @param {string} [params.outfitDescription]
 *   Detailed clothing and accessories
 * @param {string} [params.poseDescription]
 *   Anatomical pose description
 * @param {string} [params.lightingDescription]
 *   Professional lighting setup description
 * @param {string} [params.cameraDetails]
 *   Technical photography tail — camera, lens, grain, grade
 * @param {string[]} [params.referenceImagesInfo]
 *   Optional extra context about additional reference images
 * @param {string} [params.styleReference]
 *   Optional extra style notes appended to the tail
 * @param {'selfie'|'portrait'|'fullbody'|'editorial'} [params.shotType]
 *   Preset shot type that auto-fills missing fields with sensible defaults
 * @returns {string} Complete INSTARAW-format prompt string
 *
 * @example
 * // Basic usage
 * const prompt = generateNanaBananaPrompt({
 *   characterDescription: "Young East Asian woman, early 20s, long straight black hair with blunt bangs, fair skin, almond eyes, slim hourglass build",
 *   userInstructions: "rooftop sunset, yellow sundress, relaxed pose",
 *   expression: "smiling softly, eyes slightly squinted in warmth",
 *   shotType: "portrait",
 * });
 */
export function generateNanaBananaPrompt(params) {
  const {
    characterDescription,
    userInstructions,
    expression = "neutral, confident gaze toward camera",
    action = "standing still, slight weight shift to one side",
    backgroundDescription,
    outfitDescription,
    poseDescription,
    lightingDescription,
    cameraDetails,
    referenceImagesInfo = [],
    styleReference = "",
    shotType = "portrait",
  } = params;

  // Resolve defaults per shot type when not explicitly provided
  const defaults = SHOT_TYPE_DEFAULTS[shotType] || SHOT_TYPE_DEFAULTS.portrait;
  const bg = backgroundDescription || defaults.background;
  const outfit = outfitDescription || defaults.outfit;
  const pose = poseDescription || defaults.pose;
  const lighting = lightingDescription || defaults.lighting;
  const camera = cameraDetails || defaults.camera;

  // Inject user instructions into the background when no explicit background provided
  const resolvedBg = backgroundDescription
    ? backgroundDescription
    : userInstructions
      ? `${defaults.background}, ${userInstructions}`
      : defaults.background;

  // Build extra reference context
  const refContext = referenceImagesInfo.length > 0
    ? ` (additional references: ${referenceImagesInfo.join("; ")})`
    : "";

  const parts = [
    // 1. Subject anchor — the INSTARAW identity lock phrase
    `${characterDescription.trim()}, using reference image 1 for ultimate character consistency in face and body anatomy${refContext}.`,

    // 2. Expression + action
    `She is ${expression}, ${action}.`,

    // 3. Reimagined elements
    `reimagined background with ${resolvedBg}.`,
    `She wears a reimagined outfit: ${outfit}.`,
    `Her pose is reimagined as ${pose}.`,
    `Lighting reimagined as ${lighting}.`,

    // 4. Technical tail
    `${camera}${styleReference ? `, ${styleReference}` : ""}.`,
  ];

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Shot-type presets — sensible defaults that produce editorial-grade results
// ---------------------------------------------------------------------------

const SHOT_TYPE_DEFAULTS = {
  /**
   * True first-person selfie. Arm extended, front-facing camera.
   * WHY: Palm-length POV with specific phone-camera optics produces authentic
   *      selfie distortion that reads as genuinely candid to viewers.
   */
  selfie: {
    background: "softly blurred warm interior with bokeh lifestyle atmosphere, ambient golden light from a nearby window, shallow depth of field on the background",
    outfit: "stylish casual contemporary outfit — fitted top in a saturated color, high-waist jeans or skirt, minimal jewelry, natural makeup look",
    pose: "true self-captured arm-extended palm-length first-person selfie POV, front-facing camera angle, slight chin-down for jawline definition, no visible phone or device in hand, no mirror reflection",
    lighting: "diffused soft frontal fill light mimicking a phone flash with natural ambient warmth, color temperature 5500K, soft catchlights in both eyes, gentle luminosity on skin without harsh shadows",
    camera: "Shot on iPhone 15 Pro Max, 12mm ultrawide front camera, authentic selfie lens barrel distortion, warm skin tone bias, subtle digital grain, slight vignette at corners, photorealistic skin pores and fine hair strands",
  },

  /**
   * 3/4 angle close-up portrait. Head and shoulders.
   * WHY: 3/4 angle is universally flattering and gives the model room to
   *      render character without full-body anatomy challenges.
   */
  portrait: {
    background: "clean professional studio backdrop in deep charcoal grey, subtle gradient from dark to slightly lighter behind subject, no distracting elements, shallow depth of field",
    outfit: "elegant form-fitting ensemble — tailored blazer in a rich neutral tone over a soft silk blouse, minimal statement jewelry, hair styled to frame the face",
    pose: "three-quarter angle to camera, chin slightly down and turned left, shoulders relaxed, direct eye-line at lens, natural hand placement off-frame or at collarbone, 3/4 crop framing head to upper chest",
    lighting: "Rembrandt three-point lighting: key light at 45° camera-left, warm 5600K softbox, fill reflector at 30% ratio on camera-right, subtle rim separation light behind at 200°, crisp catchlights in both eyes",
    camera: "Shot on Sony A7R V, 85mm f/1.4 G Master, ISO 400 analog grain, subtle lens vignette, razor-thin depth of field, Kodak Portra 400 color science, hyperrealistic skin texture with individual pores and fine hair detail",
  },

  /**
   * Head-to-toe full body shot. All anatomy visible.
   * WHY: Full body requires explicit clothing from head to toe plus clear
   *      foot/shoe description to prevent the model cutting off at ankles.
   */
  fullbody: {
    background: "bright contemporary urban environment — clean minimal architecture, smooth concrete ground, soft ambient city light, slight environmental bokeh preserving sense of place without competing with subject",
    outfit: "full head-to-toe look — fitted crop top in a complementary color, high-waist tailored trousers or midi skirt, strappy heeled sandals or sleek ankle boots, shoulder bag or clutch, layered delicate necklaces and ear jewelry",
    pose: "full figure visible from crown of head to tips of shoes, natural contrapposto stance — weight on left leg, right hip slightly forward, one hand resting on hip and the other relaxed at side, three-quarter angle, eye-line at camera, confident elegant expression",
    lighting: "clean editorial fashion lighting: overhead large softbox as key, two hair lights for rim separation, ground-level bounce fill, even exposure head to toe with soft gradient, color temperature 5800K, no harsh shadows on floor",
    camera: "Shot on Canon EOS R5, 35mm f/2L, slight film grain ISO 200, faint chromatic aberration at highlights, clean flat fashion-editorial color grade, sharp focus across full body, hyperrealistic fabric texture and skin detail",
  },

  /**
   * High-fashion editorial — moody, cinematic.
   */
  editorial: {
    background: "dramatic cinematic environment with strong environmental storytelling — weathered industrial architecture, period-specific details, heavy atmospheric haze, deep shadow regions contrasting against a single warm practical light source, golden-hour gradient above the horizon",
    outfit: "high-fashion editorial look — avant-garde silhouette with architectural volume, premium textured fabric (leather, silk charmeuse, or technical mesh), fashion-forward accessories, statement footwear, intentional asymmetry in styling",
    pose: "powerful editorial pose — diagonal body line through frame, strong geometric negative space, unexpected hand gesture or body lean, model breaking the 4th wall with intense direct gaze, dynamic implied movement",
    lighting: "dramatic cinematic three-quarter rim-only lighting: single 2700K practical warm source raking across subject from behind at 160°, deep moody shadows front-facing, slight blue ambient fill at 10% ratio for shadow detail, specular highlights on fabric and skin",
    camera: "Shot on Hasselblad X2D 100C, 80mm f/1.9 XCD, pushed Kodak Tri-X 400 grain simulation, heavy lens vignette, teal-orange cinematic LUT, 1.33x anamorphic lens flare characteristic, ultra-sharp fabric texture and skin detail at 100MP resolution",
  },
};

// ---------------------------------------------------------------------------
// Preset builders for model creation pipeline (selfie / portrait / fullbody)
// These produce the base prompt text that then goes through the AI optimizer.
// ---------------------------------------------------------------------------

/**
 * Builds a base selfie prompt for initial AI model creation.
 * Called before passing through `optimizeNanaBananaPrompt`.
 *
 * @param {object} characterTraits - parsed looks object from model profile
 * @param {string} [customDirection] - extra user-provided pose/scene direction
 */
export function buildModelSelfiePrompt(characterTraits = {}, customDirection = "") {
  const desc = buildCharacterDescription(characterTraits);
  return generateNanaBananaPrompt({
    characterDescription: desc || "a person",
    userInstructions: customDirection,
    expression: "natural, relaxed, genuinely confident expression — slight smile, eyes alive with warmth",
    action: "capturing a true first-person selfie at palm length, front-facing camera angle",
    shotType: "selfie",
  });
}

/**
 * Builds a base portrait prompt for initial AI model creation.
 *
 * @param {object} characterTraits - parsed looks object from model profile
 * @param {string} [customDirection]
 */
export function buildModelPortraitPrompt(characterTraits = {}, customDirection = "") {
  const desc = buildCharacterDescription(characterTraits);
  return generateNanaBananaPrompt({
    characterDescription: desc || "a person",
    userInstructions: customDirection,
    expression: "captivating, alluring gaze — subtle confidence, soft parted lips",
    action: "facing slightly left of camera, chin down at a flattering angle",
    shotType: "portrait",
  });
}

/**
 * Builds a base full-body prompt for initial AI model creation.
 *
 * @param {object} characterTraits - parsed looks object from model profile
 * @param {string} [customDirection]
 * @param {string} [outfitOverride] - explicit outfit description from user selection
 */
export function buildModelFullBodyPrompt(characterTraits = {}, customDirection = "", outfitOverride = "") {
  const desc = buildCharacterDescription(characterTraits);
  return generateNanaBananaPrompt({
    characterDescription: desc || "a person",
    userInstructions: customDirection,
    expression: "confident, natural smile with direct eye contact",
    action: "standing in a relaxed contrapposto position, full height visible",
    outfitDescription: outfitOverride || undefined,
    shotType: "fullbody",
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a model's looks object into a concise character description string
 * suitable for the subject anchor section of the INSTARAW prompt.
 *
 * @param {object} traits
 * @param {string} [traits.gender]
 * @param {string} [traits.heritage]
 * @param {string} [traits.age]
 * @param {string} [traits.bodyType]
 * @param {string} [traits.hairColor]
 * @param {string} [traits.hairLength]
 * @param {string} [traits.hairTexture]
 * @param {string} [traits.eyeColor]
 * @param {string} [traits.lipSize]
 * @param {string} [traits.faceType]
 * @param {string} [traits.style]
 * @returns {string}
 */
export function buildCharacterDescription(traits = {}) {
  const {
    gender,
    heritage,
    age,
    bodyType,
    hairColor,
    hairLength,
    hairTexture,
    eyeColor,
    lipSize,
    faceType,
    style,
  } = traits;

  const parts = [
    gender ? `${gender}` : "person",
    age ? `in ${age}` : "",
    heritage ? `of ${heritage} heritage` : "",
    faceType ? `with ${faceType} facial features` : "",
    [hairLength, hairTexture, hairColor].filter(Boolean).join(" ") ? `${[hairLength, hairTexture, hairColor].filter(Boolean).join(" ")} hair` : "",
    eyeColor ? `${eyeColor} eyes` : "",
    lipSize ? `${lipSize} lips` : "",
    bodyType ? `${bodyType} build` : "",
    style ? `${style} aesthetic` : "",
  ].filter(Boolean);

  return parts.join(", ");
}

/**
 * Generates the negative prompt companion — standard exclusion list tuned for
 * NanaBanana Pro. Append to any generation call that accepts a negative prompt.
 *
 * @returns {string}
 */
export function getNanaBananaNegativePrompt() {
  return [
    "unrealistic anatomy",
    "extra limbs",
    "missing limbs",
    "deformed hands",
    "six fingers",
    "blurry face",
    "face morphing",
    "low quality",
    "watermark",
    "text overlay",
    "cartoon",
    "anime",
    "illustration",
    "painting",
    "sketch",
    "CGI render",
    "plastic skin",
    "overexposed",
    "underexposed",
    "low-light noise",
    "JPEG artifacts",
    "oversaturated",
    "overprocessed HDR",
    "AI glitch",
    "asymmetric eyes",
    "double chin exaggeration",
    "distorted background",
    "out-of-focus subject",
  ].join(", ");
}
