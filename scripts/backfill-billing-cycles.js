import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Use TEST keys in development
const stripeSecretKey = process.env.NODE_ENV === 'production' 
  ? process.env.STRIPE_SECRET_KEY 
  : process.env.TESTING_STRIPE_SECRET_KEY;

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
});

async function backfillBillingCycles() {
  console.log('🔄 Backfilling billing cycles for existing subscribers...\n');

  // Get all users with subscriptions but no billing cycle
  const users = await prisma.user.findMany({
    where: {
      stripeSubscriptionId: { not: null },
      subscriptionBillingCycle: null
    }
  });

  console.log(`📊 Found ${users.length} users with missing billing cycles\n`);

  for (const user of users) {
    try {
      console.log(`Processing ${user.email}...`);
      
      // Get subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      // Get billing interval from subscription
      const interval = subscription.items.data[0]?.plan?.interval; // 'month' or 'year'
      const billingCycle = interval === 'year' ? 'annual' : 'monthly';
      
      // Update user
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionBillingCycle: billingCycle }
      });
      
      console.log(`✅ ${user.email}: ${user.subscriptionTier} → ${billingCycle}\n`);
    } catch (error) {
      console.error(`❌ Error processing ${user.email}:`, error.message);
      console.log('');
    }
  }

  console.log('✅ Backfill complete!');
}

backfillBillingCycles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
