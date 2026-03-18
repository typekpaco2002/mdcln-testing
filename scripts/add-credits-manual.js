import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addCredits() {
  const email = process.argv[2];
  const credits = parseInt(process.argv[3]);
  
  if (!email || !credits || isNaN(credits)) {
    console.log('Usage: node scripts/add-credits-manual.js <email> <credits>');
    console.log('Example: node scripts/add-credits-manual.js maxpacanovsky002@gmail.com 290');
    process.exit(1);
  }

  console.log(`💳 Adding ${credits} credits to ${email}...\n`);

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ User not found');
      console.log('   Tried email:', email);
      console.log('   Make sure you\'re connected to the correct database (production or dev)');
      return;
    }

    console.log('✅ User found!');
    console.log(`   Current credits: ${user.credits}`);
    
    // Add credits
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        credits: {
          increment: credits
        }
      }
    });

    // Log transaction
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: credits,
        type: 'purchase',
        description: 'Manual credit addition - Stripe payment processed outside webhook'
      }
    });

    console.log('\n✅ Credits added successfully!');
    console.log(`   Old balance: ${user.credits}`);
    console.log(`   Added: ${credits}`);
    console.log(`   New balance: ${updatedUser.credits}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addCredits();
