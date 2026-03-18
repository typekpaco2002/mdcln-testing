import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Migrate existing credits to new expiration system
 * 
 * For users with active subscriptions:
 *  - Move credits → subscriptionCredits
 *  - Calculate creditsExpireAt based on billing cycle
 * 
 * For users without subscriptions:
 *  - Move credits → purchasedCredits (never expire)
 */
async function migrateCredits() {
  try {
    console.log('\n🔄 Starting credit migration to expiration system...\n');
    
    // Get all users with credits > 0
    const users = await prisma.user.findMany({
      where: {
        credits: {
          gt: 0
        }
      }
    });

    console.log(`📊 Found ${users.length} users with credits to migrate\n`);

    let migratedSubscribers = 0;
    let migratedNonSubscribers = 0;
    let errors = 0;

    for (const user of users) {
      try {
        // Skip if already migrated (has subscriptionCredits or purchasedCredits > 0)
        if (user.subscriptionCredits > 0 || user.purchasedCredits > 0) {
          console.log(`⏭️  User ${user.email}: Already migrated, skipping`);
          continue;
        }

        // Check if user has active subscription
        if (user.stripeSubscriptionId && user.subscriptionStatus === 'active') {
          // User has active subscription - credits go to subscriptionCredits with expiration
          
          // Get billing cycle from Stripe if not in DB
          let billingCycle = user.subscriptionBillingCycle;
          if (!billingCycle) {
            try {
              const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
              const interval = subscription.items.data[0]?.plan?.interval;
              billingCycle = interval === 'year' ? 'annual' : 'monthly';
            } catch (stripeError) {
              console.warn(`⚠️  User ${user.email}: Could not fetch billing cycle from Stripe, defaulting to monthly`);
              billingCycle = 'monthly';
            }
          }

          // Calculate expiration date
          const now = new Date();
          const creditsExpireAt = new Date(now);
          if (billingCycle === 'annual') {
            creditsExpireAt.setFullYear(creditsExpireAt.getFullYear() + 1);
          } else {
            creditsExpireAt.setMonth(creditsExpireAt.getMonth() + 1);
          }

          // Migrate to subscription credits
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionCredits: user.credits,
              purchasedCredits: 0,
              creditsExpireAt,
              subscriptionBillingCycle: billingCycle
            }
          });

          console.log(`✅ User ${user.email}: ${user.credits} credits → subscriptionCredits (expire ${creditsExpireAt.toDateString()})`);
          migratedSubscribers++;

        } else {
          // User has no active subscription - credits go to purchasedCredits (never expire)
          
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionCredits: 0,
              purchasedCredits: user.credits,
              creditsExpireAt: null
            }
          });

          console.log(`✅ User ${user.email}: ${user.credits} credits → purchasedCredits (never expire)`);
          migratedNonSubscribers++;
        }

      } catch (userError) {
        console.error(`❌ Error migrating user ${user.email}:`, userError.message);
        errors++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`  ✅ Subscribers migrated: ${migratedSubscribers}`);
    console.log(`  ✅ Non-subscribers migrated: ${migratedNonSubscribers}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📊 Total migrated: ${migratedSubscribers + migratedNonSubscribers}/${users.length}\n`);

    if (errors === 0) {
      console.log('🎉 Credit migration completed successfully!\n');
    } else {
      console.log('⚠️  Credit migration completed with some errors. Check logs above.\n');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateCredits()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
