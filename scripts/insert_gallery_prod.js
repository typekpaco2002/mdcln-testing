import { neon } from "@neondatabase/serverless";

const NEON_DB_URL = process.env.NEON_DATABASE_URL;
if (!NEON_DB_URL) {
  console.error("NEON_DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(NEON_DB_URL);

const USER_ID = "fbfb2c4d-b872-4df1-ae44-e4d6b1b55593";
const MODEL_ID = "74cec983-9fae-47c7-a9ae-365eb0517b55";

const imageUrls = [
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889417210_jbssnktj.png",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889418512_sb144e8h.jpg",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889420014_lq5g29zl.jpg",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889421466_0yoo6198.jpg",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889422627_lzpmo29q.jpg",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889423803_0lmvjrz9.png",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889425106_ucnf7yaq.jpg",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889426314_bbxgzgfd.jpg",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889427309_8713loh4.jpg",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889428453_pgk7c6n5.jpg",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889429648_adaeehj1.jpg",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889430778_0susz1y1.jpg",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889431960_aq7kj91u.jpg",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889433267_4ic2z1g9.jpg",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889434439_qay3jpym.jpg",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889435936_1ihrkgys.png",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889437280_8tcxszrq.jpg",
  "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/generations/1771889438564_4vaj1pz6.jpg",
];

async function main() {
  // Verify user exists
  const users = await sql`SELECT id, email FROM "User" WHERE id = ${USER_ID}`;
  if (users.length === 0) { console.error("User not found!"); process.exit(1); }
  console.log(`User: ${users[0].email}`);

  const models = await sql`SELECT id, name FROM "SavedModel" WHERE id = ${MODEL_ID}`;
  if (models.length === 0) { console.error("Model not found!"); process.exit(1); }
  console.log(`Model: ${models[0].name}`);

  let inserted = 0;
  for (const url of imageUrls) {
    const result = await sql`
      INSERT INTO "Generation" (id, "userId", "modelId", type, prompt, "creditsCost", "creditsRefunded", "actualCostUSD", "outputUrl", status, "isNsfw", "isTrial", "completedAt", "createdAt")
      VALUES (gen_random_uuid(), ${USER_ID}, ${MODEL_ID}, 'nsfw', 'MuscleMommy reference photo', 0, false, 0, ${url}, 'completed', true, false, NOW(), NOW())
      RETURNING id
    `;
    inserted++;
    console.log(`[${inserted}/${imageUrls.length}] Inserted: ${result[0].id}`);
  }

  console.log(`\nDone! Inserted ${inserted} Generation records.`);
  
  // Verify
  const count = await sql`SELECT COUNT(*) as cnt FROM "Generation" WHERE "modelId" = ${MODEL_ID} AND "userId" = ${USER_ID}`;
  console.log(`Total generations for this model: ${count[0].cnt}`);
}

main().catch(e => { console.error(e); process.exit(1); });
