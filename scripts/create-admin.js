import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  console.log('👤 Creating admin user...\n');

  const email = process.env.ADMIN_EMAIL || 'admin@modelclone.app';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.ADMIN_NAME || 'Admin';

  try {
    // Check if admin exists
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      console.log(`ℹ️  User ${email} already exists`);
      console.log(`   ID: ${existing.id}`);
      console.log(`   Role: ${existing.role}`);
      console.log(`   Verified: ${existing.isVerified}`);
      
      // Update to admin if not already
      if (existing.role !== 'admin') {
        await prisma.user.update({
          where: { email },
          data: { role: 'admin', isVerified: true }
        });
        console.log('✅ User upgraded to admin');
      }
      return;
    }

    // Create new admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'admin',
        isVerified: true,
        credits: 1000,
        subscriptionStatus: 'active'
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   ID: ${admin.id}`);
    console.log('\n⚠️  Change the password after first login!');
  } catch (error) {
    console.error('❌ Failed to create admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
