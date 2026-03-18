import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUser() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: node scripts/fix-user.js <email>');
    console.log('Example: node scripts/fix-user.js max.pacanovsky002@gmail.com');
    process.exit(1);
  }

  console.log(`🔍 Looking for user: ${email}\n`);

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ User not found in database');
      console.log('   Make sure you\'re checking the correct database (dev vs production)');
      return;
    }

    console.log('✅ User found!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Verified: ${user.isVerified}`);
    console.log(`   Credits: ${user.credits}`);
    console.log(`   Created: ${user.createdAt}`);
    
    // Auto-verify if not verified
    if (!user.isVerified) {
      console.log('\n⚠️  User is not verified. Verifying now...');
      await prisma.user.update({
        where: { email },
        data: { 
          isVerified: true,
          verificationCode: null,
          codeExpiresAt: null
        }
      });
      console.log('✅ User verified successfully!');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixUser();
