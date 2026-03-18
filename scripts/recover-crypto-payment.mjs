import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const PAYMENT_ID = '4591223775';      // NP_id from the success URL
const ORDER_ID   = '74b3715e-8038-4eab-9f5e-1c2b74963678_credits_200_1772620949616';
const USER_ID    = '74b3715e-8038-4eab-9f5e-1c2b74963678';
const CREDITS    = 200;

async function main() {
  // Guard: skip if already processed
  const payment = await prisma.cryptoPayment.findFirst({ where: { orderId: ORDER_ID } });
  if (!payment) { console.error('❌ Payment record not found'); process.exit(1); }
  if (payment.status === 'completed') { console.log('ℹ️  Already completed — nothing to do'); process.exit(0); }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: USER_ID },
      data: { purchasedCredits: { increment: CREDITS } },
    });

    await tx.cryptoPayment.update({
      where: { id: payment.id },
      data: {
        status: 'completed',
        paymentId: PAYMENT_ID,
        paidAmount: '24',
        paidCurrency: 'manual-recovery',
        completedAt: new Date(),
      },
    });

    await tx.creditTransaction.upsert({
      where: { paymentSessionId: `crypto_${PAYMENT_ID}` },
      create: {
        userId: USER_ID,
        type: 'purchase',
        amount: CREDITS,
        description: `Crypto payment — ${CREDITS} credits (manual recovery, NP_id ${PAYMENT_ID})`,
        paymentSessionId: `crypto_${PAYMENT_ID}`,
      },
      update: {},
    });
  });

  // Verify
  const user = await prisma.user.findUnique({ where: { id: USER_ID }, select: { email: true, purchasedCredits: true, credits: true } });
  console.log('✅ Credits applied successfully!');
  console.table([user]);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
