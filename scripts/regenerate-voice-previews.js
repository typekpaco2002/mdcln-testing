import 'dotenv/config';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const PREVIEW_TEXTS = {
  en: "Hello! This is a preview of my voice. I hope you like how I sound.",
  sk: "Ahoj! Toto je ukážka môjho hlasu. Dúfam, že sa ti páči ako znie.",
  cs: "Ahoj! Toto je ukázka mého hlasu. Doufám, že se ti líbí, jak zním.",
};

const CURATED_VOICE_IDS = [
  "vz3dx89akMq5gofrv9Bi",
  "BpjGufoPiobT79j2vtj4",
  "2t85BBUECtLLKQzxLD95",
  "6fZce9LFNG3iEITDfqZZ",
  "kdmDKE6EkgrWrrykO9Qt",
  "FGY2WhTYpPnrIDTdsKH5",
  "Xb7hH8MSUJpSbSDYk0k2",
  "XrExE9yKIg1WjnnlVkGX",
  "cgSgspJ2msm6clMCkdW9",
  "pFZP5JQG7iQjIQuC4Bku",
  "Hh0rE70WfnSFN80K8uJC",
  "WAhoMTNdLdMoq1j3wf3I",
  "tnSpp4vdxKPjI9w0GnoV",
  "yj30vwTGJxSHezdAGsv9",
  "OYTbf65OHHFELVut7v2H",
];

async function generateAudio(voiceId, text) {
  console.log(`   Generating audio for voice ${voiceId}...`);
  
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
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToR2(buffer, voiceId, language) {
  const key = `voice-previews/${voiceId}_${language}.mp3`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: "audio/mpeg",
  }));
  
  return `${R2_PUBLIC_URL}/${key}`;
}

async function processVoice(voiceId, voiceName) {
  console.log(`\n🎙️ Processing voice: ${voiceName} (${voiceId})`);
  
  for (const [lang, text] of Object.entries(PREVIEW_TEXTS)) {
    try {
      console.log(`   [${lang.toUpperCase()}] Generating...`);
      const audioBuffer = await generateAudio(voiceId, text);
      
      console.log(`   [${lang.toUpperCase()}] Uploading to R2...`);
      const url = await uploadToR2(audioBuffer, voiceId, lang);
      
      console.log(`   [${lang.toUpperCase()}] ✅ Done: ${url}`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`   [${lang.toUpperCase()}] ❌ Error: ${error.message}`);
    }
  }
}

async function main() {
  console.log("🔊 Voice Preview Regeneration Script (R2)");
  console.log("==========================================\n");
  
  if (!ELEVENLABS_API_KEY) {
    console.error("❌ ELEVENLABS_API_KEY not set");
    process.exit(1);
  }
  
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error("❌ R2 credentials not configured");
    process.exit(1);
  }
  
  console.log("Fetching voice names from ElevenLabs...\n");
  
  const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
  });
  const data = await response.json();
  
  const voiceMap = {};
  for (const voice of data.voices) {
    voiceMap[voice.voice_id] = voice.name;
  }
  
  console.log(`Found ${Object.keys(voiceMap).length} voices in ElevenLabs account`);
  console.log(`Processing ${CURATED_VOICE_IDS.length} curated voices...\n`);
  
  for (const voiceId of CURATED_VOICE_IDS) {
    const voiceName = voiceMap[voiceId] || voiceId;
    await processVoice(voiceId, voiceName);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("\n==========================================");
  console.log("✅ All voice previews regenerated to R2!");
  console.log("==========================================\n");
}

main().catch(console.error);
