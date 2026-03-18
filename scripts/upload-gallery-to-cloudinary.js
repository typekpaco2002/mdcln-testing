import cloudinary from 'cloudinary';
import fs from 'fs';
import path from 'path';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const galleryImages = [
  // Ashley
  { file: 'prompt-image_9260b88e_1767130350467.jpg', name: 'ashleyRooftop' },
  { file: 'prompt-image_1e6493b6_1767130350466.jpg', name: 'ashleyBeachSunset' },
  { file: 'prompt-image_32e2678e_1767130350466.jpg', name: 'ashleyCafe' },
  { file: 'prompt-image_a55e785a_1767130350467.jpg', name: 'ashleyBeachWalk' },
  { file: 'prompt-image_10bd841e_1767131338342.jpg', name: 'ashleyPinkHair' },
  { file: 'prompt-image_57520e36_1767131338342.jpg', name: 'ashleyCity' },
  { file: 'Google_Nano_Banana_Pro_Edit_4K_(1)_1767132585042.png', name: 'ashleyBeachBikini' },
  { file: 'Google_Nano_Banana_Pro_Edit_1767132588496.png', name: 'ashleyGlamDress' },
  { file: 'Google_Nano_Banana_Pro_Edit_4K_1767132592630.png', name: 'ashleyFitness' },
  
  // Laura
  { file: 'prompt-image_05e6197c_1767133813764.jpg', name: 'lauraBeach1' },
  { file: 'prompt-image_41aa3357_1767133813764.jpg', name: 'lauraBeach2' },
  { file: 'prompt-image_75c86af6_1767133813764.jpg', name: 'lauraBed' },
  { file: 'prompt-image_0726ca24_1767133813765.jpg', name: 'lauraPool' },
  { file: 'prompt-image_8653e2bb_1767133813765.jpg', name: 'lauraBeach3' },
  { file: 'prompt-image_bbe9c4db_1767133813765.jpg', name: 'lauraLibrary' },
  { file: 'prompt-image_eae1fe0b_1767133813765.jpg', name: 'lauraBedNight' },
  { file: 'prompt-image_ee280f9c_1767133813765.jpg', name: 'lauraCafe' },
  { file: 'prompt-image_f9c4d618_1767133813765.jpg', name: 'lauraHome' },
  
  // Natasha
  { file: 'prompt-image_42d3599a_1767136368262.jpg', name: 'natashaPark' },
  { file: 'prompt-image_54d85ea8_1767136368262.jpg', name: 'natashaCar1' },
  { file: 'prompt-image_137ddd54_1767136368262.jpg', name: 'natashaYoga1' },
  { file: 'prompt-image_346fa584_1767136368262.jpg', name: 'natashaYoga2' },
  { file: 'prompt-image_545ca548_1767136368262.jpg', name: 'natashaStreet' },
  { file: 'prompt-image_959e2469_1767136368262.jpg', name: 'natashaCar2' },
  { file: 'prompt-image_5611390e_1767136368262.jpg', name: 'natashaYoga3' },
  { file: 'prompt-image_dc7dad49_1767136368262.jpg', name: 'natashaYoga4' },
  { file: 'ClaudeFixer_1767136570083.png', name: 'natashaMirror' },
];

async function uploadImage(imagePath, publicId) {
  try {
    const result = await cloudinary.v2.uploader.upload(imagePath, {
      public_id: `gallery/${publicId}`,
      folder: 'modelclone',
      overwrite: true,
      resource_type: 'image'
    });
    return result;
  } catch (error) {
    console.error(`Error uploading ${publicId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting gallery upload to Cloudinary...\n');
  
  const results = {};
  const assetsDir = path.join(process.cwd(), 'attached_assets');
  
  for (const img of galleryImages) {
    const filePath = path.join(assetsDir, img.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${img.file}`);
      continue;
    }
    
    console.log(`📤 Uploading ${img.name}...`);
    const result = await uploadImage(filePath, img.name);
    
    if (result) {
      // Generate optimized URL with transformations
      const optimizedUrl = cloudinary.v2.url(`modelclone/gallery/${img.name}`, {
        fetch_format: 'auto',
        quality: 'auto',
        width: 720
      });
      results[img.name] = optimizedUrl;
      console.log(`   ✅ Done: ${optimizedUrl}`);
    }
  }
  
  console.log('\n📋 Generated URLs:\n');
  console.log('export const GALLERY_IMAGES = {');
  for (const [name, url] of Object.entries(results)) {
    console.log(`  ${name}: '${url}',`);
  }
  console.log('};');
  
  // Save to file for easy copy
  const outputPath = path.join(process.cwd(), 'scripts', 'gallery-urls.js');
  const output = `// Auto-generated Cloudinary gallery URLs
export const GALLERY_IMAGES = {
${Object.entries(results).map(([name, url]) => `  ${name}: '${url}',`).join('\n')}
};
`;
  fs.writeFileSync(outputPath, output);
  console.log(`\n✅ URLs saved to ${outputPath}`);
}

main().catch(console.error);
