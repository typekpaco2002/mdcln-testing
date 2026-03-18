import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

// Simulate webhook handler logic
async function simulateWebhook(sessionId, userId, credits) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: parseInt(credits),
          type: 'purchase',
          description: `Test webhook purchase`,
          paymentSessionId: sessionId
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          credits: {
            increment: parseInt(credits)
          }
        }
      });
    });
    return { success: true, source: 'webhook' };
  } catch (error) {
    if (error.code === 'P2002') {
      return { success: true, source: 'webhook', duplicate: true };
    }
    throw error;
  }
}

// Simulate verify-session handler logic
async function simulateVerifySession(sessionId, userId, credits) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: parseInt(credits),
          type: 'purchase',
          description: `Test verify-session purchase`,
          paymentSessionId: sessionId
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          credits: {
            increment: parseInt(credits)
          }
        }
      });
    });
    return { success: true, source: 'verify-session' };
  } catch (error) {
    if (error.code === 'P2002') {
      return { success: true, source: 'verify-session', duplicate: true };
    }
    throw error;
  }
}

// Run concurrent tests
async function testConcurrentPayments(numTests = 100) {
  console.log(`\n🧪 STARTING CONCURRENT PAYMENT TEST (${numTests} payments)\n`);
  console.log('Testing race condition: webhook + verify-session at same time\n');

  // Get a test user
  const user = await prisma.user.findFirst({
    where: { email: { contains: '@' } }
  });

  if (!user) {
    console.error('❌ No users found. Create a user first.');
    return;
  }

  console.log(`👤 Test user: ${user.email}`);
  console.log(`💰 Starting credits: ${user.credits}\n`);

  const initialCredits = user.credits;
  const creditsPerPayment = 500;
  const expectedFinalCredits = initialCredits + (numTests * creditsPerPayment);

  let successCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  console.log('⏳ Simulating payments...\n');

  // Run tests in batches to avoid overwhelming the database
  const batchSize = 10;
  for (let batch = 0; batch < numTests; batch += batchSize) {
    const batchPromises = [];
    
    for (let i = 0; i < batchSize && (batch + i) < numTests; i++) {
      const testNum = batch + i;
      const fakeSessionId = `cs_test_concurrent_${Date.now()}_${testNum}_${Math.random().toString(36).substring(7)}`;

      // Run webhook AND verify-session AT THE SAME TIME (race condition!)
      const promise = Promise.allSettled([
        simulateWebhook(fakeSessionId, user.id, creditsPerPayment),
        simulateVerifySession(fakeSessionId, user.id, creditsPerPayment)
      ]).then(results => {
        const webhookResult = results[0];
        const verifyResult = results[1];

        let isDuplicate = false;

        if (webhookResult.status === 'fulfilled' && verifyResult.status === 'fulfilled') {
          // One should succeed, one should be duplicate
          if (webhookResult.value.duplicate || verifyResult.value.duplicate) {
            isDuplicate = true;
            duplicateCount++;
          }
          successCount++;
        } else {
          errorCount++;
          console.error(`❌ Test ${testNum + 1} failed:`, 
            webhookResult.status === 'rejected' ? webhookResult.reason : '',
            verifyResult.status === 'rejected' ? verifyResult.reason : ''
          );
        }

        // Progress indicator
        if ((testNum + 1) % 10 === 0) {
          process.stdout.write(`✓ ${testNum + 1}/${numTests} `);
        }

        return { testNum, isDuplicate };
      });

      batchPromises.push(promise);
    }

    // Wait for this batch to complete
    await Promise.all(batchPromises);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n\n📊 TEST RESULTS:\n');
  console.log(`✅ Successful payments: ${successCount}/${numTests}`);
  console.log(`🔒 Duplicate prevented: ${duplicateCount} times`);
  console.log(`❌ Errors: ${errorCount}\n`);

  // Check final credit balance
  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id }
  });

  const actualFinalCredits = updatedUser.credits;
  const creditsAdded = actualFinalCredits - initialCredits;
  const expectedCreditsAdded = numTests * creditsPerPayment;

  console.log('💰 CREDIT VERIFICATION:\n');
  console.log(`Starting credits: ${initialCredits}`);
  console.log(`Expected credits added: ${expectedCreditsAdded} (${numTests} × ${creditsPerPayment})`);
  console.log(`Actual credits added: ${creditsAdded}`);
  console.log(`Final credits: ${actualFinalCredits}\n`);

  // CRITICAL: Check for duplicate credits
  if (creditsAdded === expectedCreditsAdded) {
    console.log('✅ ✅ ✅ PERFECT! No duplicate credits detected!');
    console.log('✅ Atomic transaction system working correctly!\n');
  } else if (creditsAdded > expectedCreditsAdded) {
    console.log('❌ ❌ ❌ BUG DETECTED! Duplicate credits awarded!');
    console.log(`❌ Extra credits: ${creditsAdded - expectedCreditsAdded}\n`);
  } else {
    console.log('⚠️ Credits less than expected. Some payments may have failed.\n');
  }

  // Check transaction count
  const transactionCount = await prisma.creditTransaction.count({
    where: {
      userId: user.id,
      paymentSessionId: { startsWith: 'cs_test_concurrent_' }
    }
  });

  console.log('📝 TRANSACTION LOG:\n');
  console.log(`Transactions created: ${transactionCount}`);
  console.log(`Expected transactions: ${numTests}`);
  
  if (transactionCount === numTests) {
    console.log('✅ Transaction log is correct!\n');
  } else {
    console.log('❌ Transaction count mismatch!\n');
  }

  // Cleanup test data
  console.log('🧹 Cleaning up test data...');
  await prisma.creditTransaction.deleteMany({
    where: {
      userId: user.id,
      paymentSessionId: { startsWith: 'cs_test_concurrent_' }
    }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { credits: initialCredits }
  });

  console.log('✅ Test data cleaned up\n');
}

// Run the test
const numTests = parseInt(process.argv[2]) || 100;

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   PAYMENT RACE CONDITION STRESS TEST                  ║');
console.log('╚════════════════════════════════════════════════════════╝');

testConcurrentPayments(numTests)
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
