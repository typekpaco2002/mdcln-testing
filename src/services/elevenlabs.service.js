import { isR2Configured, uploadBufferToR2 } from "../utils/r2.js";

function getElevenLabsApiKey() {
  return (
    process.env.ELEVENLABS_API_KEY ||
    process.env.ELEVEN_API_KEY ||
    process.env.ELEVENLABS_KEY ||
    ""
  );
}

const ELEVENLABS_API_KEY = getElevenLabsApiKey();
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

if (!ELEVENLABS_API_KEY) {
  console.warn("⚠️ ELEVENLABS_API_KEY not set - talking head feature will be disabled");
}

/**
 * Get list of available voices from ElevenLabs
 * Only fetches female voices from user's account (not shared library)
 * @returns {Promise<Array>} Array of voice objects with id, name, labels, language
 */
export async function getVoices() {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("Voice service not configured");
  }

  const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voice service error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  // Curated list of voice IDs with generated previews
  const curatedVoiceIds = [
    "vz3dx89akMq5gofrv9Bi", // Bianca Bodine - Sweet and Charming
    "BpjGufoPiobT79j2vtj4", // Priyanka - Calm, Neutral and Relaxed
    "2t85BBUECtLLKQzxLD95", // Amber - Calm, Elegant and Dreamy
    "6fZce9LFNG3iEITDfqZZ", // Charlotte - Warm, Clear, Modern
    "kdmDKE6EkgrWrrykO9Qt", // Alexandra - Conversational and Natural
    "FGY2WhTYpPnrIDTdsKH5", // Laura - Enthusiast, Quirky
    "Xb7hH8MSUJpSbSDYk0k2", // Alice - Clear, Engaging Educator
    "XrExE9yKIg1WjnnlVkGX", // Matilda - Professional
    "cgSgspJ2msm6clMCkdW9", // Jessica - Playful, Bright, Warm
    "pFZP5JQG7iQjIQuC4Bku", // Lily - Velvety Actress
    "Hh0rE70WfnSFN80K8uJC", // Hannah - Neutral, Polished
    "WAhoMTNdLdMoq1j3wf3I", // Hope - Smooth talker
    "tnSpp4vdxKPjI9w0GnoV", // Hope - upbeat and clear
    "yj30vwTGJxSHezdAGsv9", // Jessa - Authentic, friendly
    "OYTbf65OHHFELVut7v2H", // Hope - Natural, Clear and Calm
  ];

  const femaleVoices = data.voices
    .filter(v => curatedVoiceIds.includes(v.voice_id))
    .sort((a, b) => curatedVoiceIds.indexOf(a.voice_id) - curatedVoiceIds.indexOf(b.voice_id))
    .map(voice => ({
      id: voice.voice_id,
      name: voice.name,
      category: voice.category || "premade",
      labels: voice.labels || {},
      languages: ["en", "sk", "cs"], // All voices support EN, SK, CS
      originalPreviewUrl: voice.preview_url, // Original ElevenLabs preview (English only)
      previewUrls: {
        en: `${process.env.R2_PUBLIC_URL}/voice-previews/${voice.voice_id}_en.mp3`,
        sk: `${process.env.R2_PUBLIC_URL}/voice-previews/${voice.voice_id}_sk.mp3`,
        cs: `${process.env.R2_PUBLIC_URL}/voice-previews/${voice.voice_id}_cs.mp3`,
      },
    }));

  console.log(`📢 Loaded ${femaleVoices.length} curated female voices`);
  
  return femaleVoices;
}

/**
 * Infer age category from voice name/description
 */
function inferAgeFromName(name) {
  const nameLower = (name || "").toLowerCase();
  
  // Young indicators
  if (nameLower.includes("young") || nameLower.includes("teen") || 
      nameLower.includes("girl") || nameLower.includes("child") ||
      nameLower.includes("youthful") || nameLower.includes("fresh")) {
    return "young";
  }
  
  // Mature indicators  
  if (nameLower.includes("mature") || nameLower.includes("elder") ||
      nameLower.includes("senior") || nameLower.includes("wise") ||
      nameLower.includes("grandma") || nameLower.includes("granny")) {
    return "middle_aged";
  }
  
  // Default - most library voices are young/adult
  return "young";
}

/**
 * Generate speech audio from text using ElevenLabs
 * @param {string} text - Text to convert to speech
 * @param {string} voiceId - ElevenLabs voice ID
 * @param {object} options - Voice settings
 * @returns {Promise<Buffer>} Audio buffer (MP3)
 */
export async function textToSpeech(text, voiceId, options = {}) {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) {
    throw new Error("Voice service not configured");
  }

  console.log("\n🎙️ ============================================");
  console.log("🎙️ ELEVENLABS TEXT-TO-SPEECH");
  console.log("🎙️ ============================================");
  console.log(`🗣️ Voice ID: ${voiceId}`);
  console.log(`📝 Text length: ${text.length} characters`);
  console.log("⏳ Generating audio...\n");

  const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text: text,
      model_id: options.modelId || "eleven_multilingual_v2",
      voice_settings: {
        stability: options.stability || 0.5,
        similarity_boost: options.similarityBoost || 0.75,
        style: options.style || 0.0,
        use_speaker_boost: options.speakerBoost !== false,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("❌ ElevenLabs TTS error:", error);
    throw new Error(`Voice service error: ${response.status} - ${error}`);
  }

  const audioBuffer = await response.arrayBuffer();
  console.log(`✅ Audio generated: ${audioBuffer.byteLength} bytes`);
  
  return Buffer.from(audioBuffer);
}

/**
 * Upload talking-head audio to R2 hosting
 * @param {Buffer} audioBuffer - Audio data
 * @param {string} publicId - Optional compatibility arg (unused)
 * @returns {Promise<{url: string, duration: number}>} URL and duration in seconds
 */
export async function uploadAudioToR2(audioBuffer, publicId = null) {
  void publicId;
  if (!isR2Configured()) {
    throw new Error("Audio hosting is not configured (R2 is unavailable).");
  }

  const r2Url = await uploadBufferToR2(
    audioBuffer,
    "talking-head-audio",
    "mp3",
    "audio/mpeg",
  );
  console.log(`✅ Audio uploaded to R2: ${r2Url}`);
  return { url: r2Url, duration: 0 };
}

/**
 * Voice speed profiles (seconds per character)
 * Measured from actual ElevenLabs audio samples
 * Higher value = slower speech = more expensive
 * 
 * Formula: audio_duration / text_length = seconds_per_char
 * Example: 7s audio / 100 chars = 0.07 s/char
 */
const VOICE_SPEED_PROFILES = {
  // Curated voices - measured average speeds
  "vz3dx89akMq5gofrv9Bi": 0.065, // Bianca - faster, energetic
  "BpjGufoPiobT79j2vtj4": 0.070, // Priyanka - calm, moderate
  "2t85BBUECtLLKQzxLD95": 0.075, // Amber - calm, elegant, slower
  "6fZce9LFNG3iEITDfqZZ": 0.068, // Charlotte - warm, moderate
  "kdmDKE6EkgrWrrykO9Qt": 0.065, // Alexandra - conversational, faster
  "FGY2WhTYpPnrIDTdsKH5": 0.070, // Laura - enthusiastic
  "Xb7hH8MSUJpSbSDYk0k2": 0.072, // Alice - clear educator
  "XrExE9yKIg1WjnnlVkGX": 0.070, // Matilda - professional
  "cgSgspJ2msm6clMCkdW9": 0.068, // Jessica - playful, bright
  "pFZP5JQG7iQjIQuC4Bku": 0.075, // Lily - velvety, slower
  "Hh0rE70WfnSFN80K8uJC": 0.070, // Hannah - neutral, polished
  "WAhoMTNdLdMoq1j3wf3I": 0.072, // Hope - smooth talker
  "tnSpp4vdxKPjI9w0GnoV": 0.065, // Hope upbeat - faster
  "yj30vwTGJxSHezdAGsv9": 0.068, // Jessa - authentic
  "OYTbf65OHHFELVut7v2H": 0.072, // Hope natural - calm, slower
};

// Default for unknown voices (conservative - assumes slower speech)
const DEFAULT_SECONDS_PER_CHAR = 0.075;

/**
 * Get estimated audio duration based on text length and voice
 * Uses per-voice speed profiles for accurate estimates
 * @param {string} text - Text content
 * @param {string} voiceId - ElevenLabs voice ID
 * @returns {number} Estimated duration in seconds
 */
export function estimateAudioDuration(text, voiceId = null) {
  const secondsPerChar = voiceId && VOICE_SPEED_PROFILES[voiceId] 
    ? VOICE_SPEED_PROFILES[voiceId] 
    : DEFAULT_SECONDS_PER_CHAR;
  
  const duration = text.length * secondsPerChar;
  
  // WaveSpeed minimum is 5 seconds
  return Math.max(5, Math.ceil(duration));
}

/**
 * Sample preview phrases for each language
 */
const PREVIEW_PHRASES = {
  en: "Hey this is how I sound, I hope you will pick me.",
  sk: "Ahoj! Takto znie môj hlas. Dúfam, že sa ti páči.",
  cs: "Ahoj! Takto zní můj hlas. Doufám, že se ti líbí.",
};

// In-memory cache for preview URLs (persists during server runtime)
const previewCache = new Map();

/**
 * Generate a voice preview in the specified language with caching
 * First request generates and caches to R2, subsequent requests serve from cache
 * @param {string} voiceId - ElevenLabs voice ID
 * @param {string} language - Language code (en, sk, cs)
 * @returns {Promise<{buffer?: Buffer, cachedUrl?: string}>} Audio buffer or cached URL
 */
export async function generateVoicePreview(voiceId, language = "en") {
  const cacheKey = `${voiceId}_${language}`;
  
  // Check in-memory cache first
  if (previewCache.has(cacheKey)) {
    console.log(`🔊 Preview cache hit: ${cacheKey}`);
    return { cachedUrl: previewCache.get(cacheKey) };
  }

  console.log(`🔊 Preview cache miss - generating: ${cacheKey}`);
  
  const phrase = PREVIEW_PHRASES[language] || PREVIEW_PHRASES.en;
  const audioBuffer = await textToSpeech(phrase, voiceId, {
    stability: 0.5,
    similarityBoost: 0.75,
  });

  // Upload to R2 for permanent caching
  try {
    const { uploadToR2 } = await import("../utils/r2.js");
    const r2Url = await uploadToR2(audioBuffer, `voice-previews/${cacheKey}.mp3`, "audio/mpeg");
    previewCache.set(cacheKey, r2Url);
    console.log(`✅ Preview cached to R2: ${r2Url}`);
    return { buffer: audioBuffer, cachedUrl: r2Url };
  } catch (err) {
    console.error("Failed to cache preview to R2:", err.message);
    // Return buffer anyway even if caching failed
    return { buffer: audioBuffer };
  }
}
