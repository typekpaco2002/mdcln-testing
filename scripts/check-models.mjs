import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const models = await prisma.savedModel.findMany({
    select: {
      id: true,
      userId: true,
      name: true,
      photo1Url: true,
      photo2Url: true,
      photo3Url: true
    }
  });
  
  console.log('Total models:', models.length);
  
  const cloudinaryModels = models.filter(m => 
    m.photo1Url?.includes('cloudinary.com') ||
    m.photo2Url?.includes('cloudinary.com') ||
    m.photo3Url?.includes('cloudinary.com')
  );
  console.log('Models with Cloudinary URLs:', cloudinaryModels.length);
  
  const r2Models = models.filter(m => 
    m.photo1Url?.includes('r2.dev') ||
    m.photo2Url?.includes('r2.dev') ||
    m.photo3Url?.includes('r2.dev')
  );
  console.log('Models with R2 URLs:', r2Models.length);
  
  if (cloudinaryModels.length > 0) {
    console.log('\nCloudinary models to migrate:');
    cloudinaryModels.forEach(m => {
      console.log('  ID:', m.id, '| User:', m.userId, '| Name:', m.name);
    });
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
