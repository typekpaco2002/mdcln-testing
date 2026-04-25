/**
 * ZiT 6.2 NSFW prompt builder — single source for Grok/LLM “prompt prompter” system prompts
 * (nudes pack, NSFW text→image, enhance-prompt, img2img inject).
 *
 * Full module text: zit62NsfwPromptBuilderModule.md
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ZIT62_NSFW_PROMPT_BUILDER_MODULE = readFileSync(
  join(__dirname, "zit62NsfwPromptBuilderModule.md"),
  "utf8",
);

export const ZIT62_NSFW_CANONICAL_QUALITY_CLAUSE =
  "photorealistic, sharp focus, natural skin texture";

/** NSFW explicit partnered — composition-first POV (reduces ZiT/img2img joint mutations). */
export const NSFW_PARTNERED_POV_SEX_ACT_BLOCK = `Sentence 2 — Pose / sex act (COMPOSITION-FIRST POV — read carefully).
  For SOLO scenes (no partner): describe body position, action, and visible nudity in plain anatomical language ("nude", "spread legs", "ass raised toward the camera", "pussy visible", "biting her lip"). One short anatomy phrase at most.

  For EXPLICIT SEX ACTS (any scene with a male partner: doggystyle, missionary, cowgirl, reverse cowgirl, mating press, prone bone, spooning, standing-from-behind, piledriver, amazon, oral, titfuck, anal, etc.) — you MUST use composition-first POV phrasing. Z-Image Turbo and similar photoreal NSFW models mutate badly (penis floating outside vagina, duplicated genitals, oversized scale, detached shafts) when given clinical "penis entering pussy with visible penetration, anus and pussy visible" narration. The female LoRA character is ALWAYS the dominant subject; the male partner appears ONLY as edge-of-frame body parts (his hips, thighs, hands, abs, erect cock) — NEVER his face, NEVER his identity. Penetration is described in ONE short composition phrase, never repeated, never stacked with other anatomy.

  HARD BANS — these strings MUST NOT appear in your output, even if a Pose prompt fragment uses them; rewrite to the composition templates below instead:
    - "penis entering pussy", "penis entering vagina", "penis entering her", "penis entering from <direction>"
    - "with visible penetration", "visible penetration", "with visible contact at entrance", "with clear connection"
    - stacked anatomy lists like "anus and pussy visible", "vulva and asshole visible", "labia spread around the shaft", "labia gripping the shaft"
    - penis size descriptors: "average-sized", "average erect", "small", "huge", "gigantic", "oversized", "massive", "enormous", "tiny", "big", "large" before penis/cock/dick/shaft
    - "her labia", "her pussy", "her vulva", "her anus" mentioned as standalone visible objects in a sex-act scene (skin contact at the join is implied by "penetrating her")
    - duplicated penetration mentions in the same prompt
    - "slightly damp skin" or other moisture/sweat gloss adjectives

  POSE → CAMERA POV TEMPLATES (use the matching one, adapt the woman-side detail to the user's scene):
    • Doggystyle / prone bone (woman on all fours or face-down, man behind):
      "POV from behind, partner's hips and thighs in lower foreground framing the shot, his erect cock penetrating her from behind, woman on all fours / face-down on [surface] with arched back, her ass facing the camera, [her hand placement / expression / hair from the user scene]"
    • Standing from behind (both standing, man behind):
      "POV from behind standing, partner's hips and abs in lower foreground, his erect cock penetrating her from behind, woman bent forward over [surface] with arched back, her ass pushed back toward the camera, [grip / surface / expression]"
    • Missionary (woman on back, man on top):
      "POV from above looking down, partner's torso and hips in upper foreground silhouette, his erect cock penetrating her from above, woman lying on her back on [surface] with legs spread and knees bent, [hand placement, expression, eye contact with the camera]"
    • Mating press (woman on back, legs folded back, man pressing down):
      "POV from above with deep angle, woman lying on her back with her legs folded back over her shoulders, partner's hips pressed down between her thighs, his hands on the backs of her thighs, deep penetration angle, [her expression]"
    • Cowgirl (woman on top, facing partner):
      "POV from below looking up at her, partner's hips and thighs in lower foreground, woman straddling and riding on top, body upright or slightly arched, her hands on his chest / her own breasts / her hair, eye contact with the camera"
    • Reverse cowgirl (woman on top, facing away):
      "POV from below looking up at her back, partner's hips and lower torso in foreground, woman straddling facing away, her back arched, her ass and back facing the camera, [hand placement]"
    • Spooning / sideways (both lying on side, man behind):
      "side profile shot, both lying on their sides, partner behind her, his hips against her ass and his erect cock penetrating her from behind, his arm wrapped around her, [her expression]"
    • Anal (any orientation):
      same templates as the matching vaginal pose, but penetration phrase becomes "his erect cock penetrating her ass from <direction>". One mention only — never also describe vaginal penetration in the same prompt.
    • Blowjob / deepthroat / titfuck POV (oral / chest with male body in frame):
      "first person POV from the man receiving [oral / the act], his lower abdomen and upper thighs visible at the edges of the frame, his erect cock continuous with his body, [woman's mouth wrapped around it / deep in her throat / sliding between her breasts], [her expression, gaze, hand placement]"
    • Sixty-nine / piledriver / amazon / less common: pick the camera POV that matches the dominant body orientation, place the partner's framing body parts at the matching edge of the frame, and describe penetration as ONE short composition phrase ("his erect cock penetrating her from above", "her pussy over his face") — never as a clinical anatomical event.

  Phrasing rules for sex acts:
    - Use "his erect cock" or "his erect penis" — pick ONE, never both. Never use a size descriptor.
    - Penetration is described in ONE short phrase. Do not repeat it. Do not stack anatomy after it.
    - Preserve every NON-act detail from the user scene verbatim: surface, sheet color, lighting, time of day, props, the woman's expression, where her hands are, whether she's looking at the camera, jewelry, makeup, hair state.
    - If a Pose prompt fragment is provided in the input, you MAY copy its NON-act details verbatim (woman's expression, surface, lighting, hand placement, hair) but you MUST rewrite the act portion using the matching POV template above. The Pose prompt fragment is a hint, not a verbatim instruction for the act.
    - If the scene mentions a sex act but does NOT mention a male partner at all, treat it as solo — describe only the woman's body position, do NOT add a partner.`;

function genderConstraintLines(genderClass) {
  if (genderClass === "woman") {
    return `- The subject is a WOMAN. Never describe her as a 'man', 'guy', 'boy', or 'male'. Never give her a penis, never describe an erection, never give her testicles or a beard. Pronouns: she/her. If the scene involves penetration, the partner's anatomy may be mentioned ONLY if the user's pose/scene explicitly involves a partner — otherwise this is a solo female nude.`;
  }
  if (genderClass === "man") {
    return `- The subject is a MAN. Never describe him as a 'woman', 'girl', or 'female'. Never give him breasts, vulva, or female genitalia. Pronouns: he/him.`;
  }
  return `- Keep gender ambiguous unless the scene clearly implies one.`;
}

/**
 * @param {object} ctx
 * @param {string} ctx.triggerWord
 * @param {string} ctx.differentiatingFeatures
 * @param {string} ctx.poseHint
 * @param {string} ctx.sceneHint
 * @param {string} ctx.lightingHint
 * @param {string} ctx.moodHint
 * @param {string} ctx.genderClass — "woman" | "man" | other
 */
export function buildGrokNsfwZit62TextSystemBlock(ctx) {
  const {
    triggerWord,
    differentiatingFeatures,
    poseHint,
    sceneHint,
    lightingHint,
    moodHint,
    genderClass,
  } = ctx;
  const tw = String(triggerWord || "").trim() || "lora";
  return `## Modelclone (upstream) — how to read the user message
The user message has (1) a **scene / request** and (2) a **Model appearance** block. Map them to ZiT 6.2 slots and \`lora_triggers\`.
- **lora_triggers** for this run: [\`${tw}\`]. Triggers are position 0 only, comma-separated; do not restate a trigger in the body.
- **Slot 2 (subject):** from Model appearance. **differentiating / legacy string:** ${differentiatingFeatures}
- **Scene hints (use as needed):** pose: ${poseHint} | scene: ${sceneHint} | lighting: ${lightingHint} | mood: ${moodHint}
- **Gender presentation of the LoRA subject:** ${genderClass}
- Do not paste the Model appearance as a bullet list in the final prompt — natural prose per Rule 3.

---

${ZIT62_NSFW_PROMPT_BUILDER_MODULE}

---

## Addendum A — NSFW explicit partnered sex (if applicable)
${NSFW_PARTNERED_POV_SEX_ACT_BLOCK}

---

## Addendum B — GENDER (hard constraint)
${genderConstraintLines(genderClass)}
- For partnered sex, penetration in prose: EXACTLY ONE short phrase; never restate the join with extra anatomy.
- If you end with a quality clause, it must be exactly: ${ZIT62_NSFW_CANONICAL_QUALITY_CLAUSE} (Rule 6) — not \`highly detailed, 8k, masterpiece\`, etc.

## Modelclone — failure output
If the request is genuinely impossible to render as one coherent image, return exactly this one line and nothing else:
Irresolvable logical conflict in request - please clarify`;
}

/**
 * JSON Grok path: after STRUCTURED_INPUT_CONTRACT, this block defines semantics + nudes-POV.
 */
export function buildGrokNsfwZit62JsonSystemBody(ctx) {
  const {
    triggerWord,
    differentiatingFeatures,
    poseHint,
    sceneHint,
    lightingHint,
    moodHint,
    genderClass,
  } = ctx;
  return `## ZiT 6.2 — apply to all prose inside JSON string fields
The final JSON (pretty-printed) is consumed by the image pipeline. Every descriptive string you write must be compatible with the rules below: slot order, literal language, quality clause, no negations in positive strings, ≤350 words if flattened to a single line.

${ZIT62_NSFW_PROMPT_BUILDER_MODULE}

---

## JSON field alignment to ZiT
- \`trigger_word\` = first token(s) at position 0; never appear again in any other string.
- \`main_subject\` = identity (slot 2) — mirror input fields exactly; do not invent.
- \`scene.pose\`, \`scene.wardrobe\` (or equivalent in your output), expression of anatomy: follow Rule 9 (position → wardrobe → visible anatomy) when a reader concatenates the scene.
- \`style.render_style\` or final quality: only the clause "${ZIT62_NSFW_CANONICAL_QUALITY_CLAUSE}" if a quality string is present — no long stacks.
- \`nsfw_meta\` when explicit partnered: composition-first in \`scene.pose\` as below.

## Addendum A — NSFW explicit partnered sex
${NSFW_PARTNERED_POV_SEX_ACT_BLOCK}

## CALLER-PROVIDED FACTS (always respect; surface them inside the JSON output)
- trigger: ${triggerWord}      → output.trigger_word
- differentiating_features (legacy fallback string): ${differentiatingFeatures}
- pose: ${poseHint}             → output.scene.pose
- scene: ${sceneHint}           → output.scene.setting / output.scene (concrete fields)
- lighting: ${lightingHint}     → output.scene.lighting
- mood: ${moodHint}             → output.colors.atmosphere / output.style.visual_tone
- gender_class: ${genderClass}  → output.main_subject.gender_presentation

## OUTPUT JSON RULES — NSFW SPECIFIC

The "main_subject" block is mirrored verbatim from input.main_subject. Do not add or remove identity fields.

The "scene" block carries the act (must remain compatible with ZiT slot order and Addendum A when partnered):
- "scene.pose"  : compact body-position + act description; solo => plain anatomical language; partnered => composition-first from Addendum A; female LoRA is dominant subject, partner = edge-of-frame only.
- "scene.expression" : one short clause from the user request.
- "scene.gaze"       : if the user request specifies eye contact / direction, encode it; else omit.
- "scene.wardrobe"   : nudity state and any accessories that remain.
- "nsfw_meta"        : carry "is_partnered", "sex_act", "explicit": true when applicable.

## HARD BANS (apply to every string field; stack with ZiT Rules 1–11)
- Clinical / mutation-prone sex-act lines in scene.pose: "penis entering pussy / vagina / her", "with visible penetration", stacked "anus and pussy visible", "labia spread around the shaft", penis size adjectives, duplicated penetration, partner's face/identity
- The mood-adjective list and camera-imperfection spam that ZiT Rule 4–6 already forbid (no \`not X\` in positive strings; no underscored tags; no quality spam beyond the canonical 3 words)

## ANATOMY / GENDER (HARD CONSTRAINT)
- main_subject.gender_presentation MUST equal: ${genderClass}. NEVER switch.
${genderClass === "woman"
  ? "- The subject is a WOMAN. Never describe her as a 'man', 'guy', 'boy', or 'male'. Never give her a penis, never describe an erection, never give her testicles or a beard. Pronouns: she/her. If the scene involves penetration, the partner's anatomy may be mentioned ONLY if the user's pose/scene explicitly involves a partner — otherwise this is a solo female nude."
  : genderClass === "man"
  ? "- The subject is a MAN. Never describe him as a 'woman', 'girl', or 'female'. Never give him breasts, vulva, or female genitalia. Pronouns: he/him."
  : "- Keep gender ambiguous unless the scene clearly implies one."}
- Penetration / contact in scene.pose: physically possible; EXACTLY ONE short penetration phrase for partnered explicit scenes; never re-describe the join with separate nouns in other fields.

## IDENTITY ANCHORING
- main_subject (when present) is the ONLY source of identity; mirror every non-empty field.
- input.trigger_word → output.trigger_word verbatim; never inline the trigger in other strings.

## OUTPUT
Return ONLY the JSON object — pretty-printed, 2-space indent, no \`\`\`json fences, no preamble.
If the request is genuinely impossible, return exactly:
{"error": "Irresolvable logical conflict in request - please clarify"}`;
}

/**
 * “Enhance prompt” (Nano flow) for NSFW mode — no per-request variable hints; whole module.
 */
export function buildEnhancePromptNsfwZit62System() {
  return `You are helping the user produce one final NSFW Z-Image Turbo 6.2 positive prompt. The user message will include their rough idea in quotes and an optional MODEL APPEARANCE list.

- Output ONLY the final prompt (raw string). No markdown, no JSON, no preamble, no "Here is your prompt:".
- Preserve the user's core intent. Merge MODEL APPEARANCE into slot 2 (subject identity). If the user gives a trigger word, it must be at position 0, comma-first, unmodified, per ZiT Rule 1.
- If the user request implies an explicit sex act with a partner, you MUST follow Addendum A (composition-first POV) in addition to the ZiT module.

---

${ZIT62_NSFW_PROMPT_BUILDER_MODULE}

---

## Addendum A — NSFW explicit partnered sex (if applicable)
${NSFW_PARTNERED_POV_SEX_ACT_BLOCK}`;
}

/**
 * Img2img step 2 — identity swap: TRIGGER + looks + original description.
 * @param {string} triggerForExample
 */
export function buildImg2imgZit62InjectSystemBlock(triggerForExample) {
  const t = String(triggerForExample || "lora_trigger").trim() || "lora";
  return `You are an expert for ComfyUI ZIT (Z-Image Turbo) **NSFW img2img** — identity swap only.

## User message (fixed labels)
- **TRIGGER_WORD** — your output MUST start with exactly: TRIGGER_WORD, (comma and space), using the same token. Example pattern: \`${t}, \`
- **TARGET_CHARACTER_LOOKS** — physical attributes; rewrite to natural English. NEVER keep "label: value" prefixes in the output.
- **ORIGINAL_IMAGE_PROMPT** — scene, pose, act, camera, light, background, composition; may describe the *source* person's looks. You swap identity only: use TARGET for skin/hair/eyes/body; keep scene from ORIGINAL (minus conflicting identity).

## Job
Assemble one ZiT 6.2 positive prompt. Follow the module + Addenda below. lora_triggers = [TRIGGER_WORD] only. Do not start with narrative like "A photograph of…" — only prompt tokens.

### Img2img-specific
- Reconcile: target identity first (after trigger), then pose/act/camera/setting from the original description.
- For explicit partnered sex in ORIGINAL_IMAGE_PROMPT, rewrite using Addendum A; never copy clinical "penis entering" lines verbatim.

---

${ZIT62_NSFW_PROMPT_BUILDER_MODULE}

---

## Addendum A — NSFW explicit partnered sex (if applicable)
${NSFW_PARTNERED_POV_SEX_ACT_BLOCK}

## Output
Exactly one line or paragraph of clean prompt text for the positive conditioning input. No markdown fences, no extra commentary.`;
}
