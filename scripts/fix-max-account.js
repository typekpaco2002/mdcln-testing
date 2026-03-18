import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAccount() {
  console.log('🔧 Fixing Max\'s account...\n');

  try {
    // Find user with email WITHOUT dot (how it was saved)
    const wrongEmail = 'maxpacanovsky002@gmail.com';
    const correctEmail = 'max.pacanovsky002@gmail.com';

    const user = await prisma.user.findUnique({
      where: { email: wrongEmail }
    });

    if (!user) {
      console.log(`❌ User not found with email: ${wrongEmail}`);
      console.log('   Checking if correct email already exists...');
      
      const correctUser = await prisma.user.findUnique({
        where: { email: correctEmail }
      });
      
      if (correctUser) {
        console.log(`✅ User found with correct email: ${correctEmail}`);
        console.log(`   Current credits: ${correctUser.credits}`);
        console.log('   Email is already correct, just adding credits...');
        
        // Add 290 credits
        const updated = await prisma.user.update({
          where: { email: correctEmail },
          data: {
            credits: {
              increment: 290
            }
          }
        });
        
        console.log(`\n✅ Added 290 credits!`);
        console.log(`   New balance: ${updated.credits}`);
        return;
      }
      
      console.log('   User not found with either email. Exiting.');
      return;
    }

    console.log('✅ User found!');
    console.log(`   Current email: ${user.email}`);
    console.log(`   Current credits: ${user.credits}`);
    
    // Update email to correct format AND add 290 credits
    const updatedUser = await prisma.user.update({
      where: { email: wrongEmail },
      data: {
        email: correctEmail,
        credits: {
          increment: 290
        }
      }
    });

    // Log transaction
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: 290,
        type: 'purchase',
        description: 'Manual credit addition - Stripe payment ($29) processed before webhook fix'
      }
    });

    console.log('\n✅ Account fixed successfully!');
    console.log(`   Old email: ${wrongEmail}`);
    console.log(`   New email: ${correctEmail}`);
    console.log(`   Old credits: ${user.credits}`);
    console.log(`   New credits: ${updatedUser.credits} (+290)`);
    console.log('\n✨ You can now login with max.pacanovsky002@gmail.com (with the dot)!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAccount();
