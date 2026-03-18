import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, credits: true, purchasedCredits: true, subscriptionCredits: true, createdAt: true }
  });
  console.log('\n=== USERS ===');
  console.table(users);

  const payments = await prisma.cryptoPayment.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log('\n=== CRYPTO PAYMENTS ===');
  console.table(payments);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
