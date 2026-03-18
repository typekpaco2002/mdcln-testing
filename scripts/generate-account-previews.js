/**
 * Generate previews for voices from user's account
 */

import 'dotenv/config';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

const PREVIEW_PHRASES = {
  en: "Hey this is how I sound, I hope you will pick me.",
  sk: "Ahoj! Takto znie môj hlas. Dúfam, že sa ti páči.",
  cs: "Ahoj! Takto zní můj hlas. Doufám, že se ti líbí.",
};

async function getAccountVoices() {
  const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
  });
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
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!response.ok) throw new Error(`TTS error: ${response.status}`);
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
    cloudinary.v2.uploader.upload_stream(
      { resource_type: "video", folder: "talking-head-audio", public_id: publicId, format: "mp3", overwrite: true },
      (error, result) => error ? reject(error) : resolve(result.secure_url)
    ).end(audioBuffer);
  });
}

async function main() {
  const language = process.argv[2] || "en";
  const limit = parseInt(process.argv[3]) || 15;
  
  console.log(`\n🎙️ Generating ${limit} previews for: ${language.toUpperCase()}`);
  console.log(`📝 Text: "${PREVIEW_PHRASES[language]}"\n`);
  
  const allVoices = await getAccountVoices();
  const femaleVoices = allVoices.filter(v => v.labels?.gender === 'female').slice(0, limit);
  
  console.log(`📢 Processing ${femaleVoices.length} female voices\n`);
  
  let success = 0;
  for (let i = 0; i < femaleVoices.length; i++) {
    const voice = femaleVoices[i];
    console.log(`[${i + 1}/${femaleVoices.length}] ${voice.name}...`);
    
    try {
      const audioBuffer = await textToSpeech(PREVIEW_PHRASES[language], voice.voice_id);
      const url = await uploadToCloudinary(audioBuffer, `voice-previews/${voice.voice_id}_${language}`);
      console.log(`   ✅ ${url}`);
      success++;
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.log(`   ❌ ${err.message}`);
    }
  }
  
  console.log(`\n✅ Done: ${success}/${femaleVoices.length}`);
}

main().catch(console.error);
