/**
 * Script to pre-generate voice previews for all voices
 * Run with: node scripts/generate-previews.js <language>
 * Example: node scripts/generate-previews.js en
 */

import 'dotenv/config';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

const PREVIEW_PHRASES = {
  en: "Hey this is how I sound, I hope you will pick me.",
  sk: "Ahoj! Takto znie môj hlas. Dúfam, že sa ti páči.",
  cs: "Ahoj! Takto zní můj hlas. Doufám, že se ti líbí.",
};

async function getVoicesForLanguage(language) {
  const response = await fetch(
    `${ELEVENLABS_API_URL}/shared-voices?page_size=25&gender=female&language=${language}&page=1&sort=trending`,
    {
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.status}`);
  }
  
  const data = await response.json();
  return data.voices || [];
}

async function textToSpeech(text, voiceId) {
  const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text: text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TTS error: ${response.status} - ${error}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function uploadToCloudinary(audioBuffer, publicId) {
  const cloudinary = await import("cloudinary");
  
  cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      {
        resource_type: "video",
        folder: "talking-head-audio",
        public_id: publicId,
        format: "mp3",
        overwrite: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    
    uploadStream.end(audioBuffer);
  });
}

async function main() {
  const language = process.argv[2] || "en";
  
  if (!PREVIEW_PHRASES[language]) {
    console.error(`Unknown language: ${language}. Use: en, sk, cs`);
    process.exit(1);
  }
  
  console.log(`\n🎙️ Generating previews for language: ${language.toUpperCase()}`);
  console.log(`📝 Text: "${PREVIEW_PHRASES[language]}"`);
  console.log(`📊 Characters: ${PREVIEW_PHRASES[language].length}\n`);
  
  const voices = await getVoicesForLanguage(language);
  console.log(`📢 Found ${voices.length} voices\n`);
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < voices.length; i++) {
    const voice = voices[i];
    const cacheKey = `voice-previews/${voice.voice_id}_${language}`;
    
    console.log(`[${i + 1}/${voices.length}] ${voice.name}...`);
    
    try {
      // Generate audio
      const audioBuffer = await textToSpeech(PREVIEW_PHRASES[language], voice.voice_id);
      
      // Upload to Cloudinary
      const url = await uploadToCloudinary(audioBuffer, cacheKey);
      
      console.log(`   ✅ Cached: ${url}`);
      success++;
      
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${success} success, ${failed} failed`);
  console.log(`💰 Credits used: ~${success * PREVIEW_PHRASES[language].length} characters`);
}

main().catch(console.error);
