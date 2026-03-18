import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user if doesn't exist
  const adminEmail = 'admin@modelclone.app';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin',
        role: 'admin',
        isVerified: true,
        credits: 1000,
        subscriptionStatus: 'active'
      }
    });
    console.log('✅ Admin user created');
    console.log('   Email: admin@modelclone.app');
    console.log('   Password: admin123');
  } else {
    console.log('ℹ️  Admin user already exists');
  }

  // Create test user if doesn't exist (only in development)
  if (process.env.NODE_ENV === 'development') {
    const testEmail = 'test@modelclone.app';
    const existingTest = await prisma.user.findUnique({
      where: { email: testEmail }
    });

    if (!existingTest) {
      const hashedPassword = await bcrypt.hash('test123', 10);
      await prisma.user.create({
        data: {
          email: testEmail,
          password: hashedPassword,
          name: 'Test User',
          role: 'user',
          isVerified: true,
          credits: 500,
          subscriptionStatus: 'active'
        }
      });
      console.log('✅ Test user created (dev only)');
      console.log('   Email: test@modelclone.app');
      console.log('   Password: test123');
    }
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
