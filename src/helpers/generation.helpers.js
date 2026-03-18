import prisma from "../lib/prisma.js";
import { 
  checkAndExpireCredits, 
  getTotalCredits, 
  deductCredits,
  refundCredits,
  refundGeneration
} from '../services/credit.service.js';
import requestQueue from '../services/queue.service.js';

/**
 * Validate model ownership
 * @param {string} modelId - Model ID to validate
 * @param {number} userId - User ID making the request
 * @returns {Promise<Object>} Model object if valid
 * @throws {Error} If model not found or unauthorized
 */
export async function validateModelOwnership(modelId, userId) {
  const model = await prisma.savedModel.findUnique({
    where: { id: modelId }
  });

  if (!model) {
    throw new Error('Model not found');
  }

  if (model.userId !== userId) {
    throw new Error('Not authorized to use this model');
  }

  return model;
}

/**
 * Validate and reserve credits atomically
 * Checks user has enough credits and deducts them upfront
 * @param {number} userId - User ID
 * @param {number} creditsNeeded - Credits required
 * @returns {Promise<Object>} { totalCredits, updatedUser }
 * @throws {Error} If insufficient credits
 */
export async function validateAndReserveCredits(userId, creditsNeeded) {
  // Check credits with expiration
  const user = await checkAndExpireCredits(userId);
  const totalCredits = getTotalCredits(user);
  
  if (totalCredits < creditsNeeded) {
    throw new Error(`Need ${creditsNeeded} credits. You have ${totalCredits} credits.`);
  }

  // Deduct upfront (atomic transaction)
  const updatedUser = await deductCredits(userId, creditsNeeded);
  console.log(`✅ Credits reserved upfront: ${creditsNeeded} (will refund if fails)`);

  return { totalCredits, updatedUser };
}

/**
 * Create generation record with standardized fields
 * @param {Object} data - Generation data
 * @returns {Promise<Object>} Created generation record
 */
export async function createGenerationRecord(data) {
  return await prisma.generation.create({
    data: {
      userId: data.userId,
      modelId: data.modelId || null,
      type: data.type,
      prompt: data.prompt,
      inputImageUrl: data.inputImageUrl,
      inputVideoUrl: data.inputVideoUrl || null,
      status: 'processing',
      creditsCost: data.creditsCost,
      replicateModel: data.replicateModel
    }
  });
}

/**
 * Handle generation result - update record and handle refunds
 * @param {Object} generation - Generation record
 * @param {Object} result - API result { success, outputUrl?, error? }
 * @param {number} creditsDeducted - Amount of credits deducted upfront
 * @returns {Promise<Object>} { success, generation?, refunded }
 */
export async function handleGenerationResult(generation, result, creditsDeducted) {
  // Never set completed when deferred (callback will update) or when outputUrl is missing
  if (result.success && !result.deferred && result.outputUrl) {
    const updated = await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: 'completed',
        outputUrl: result.outputUrl,
        completedAt: new Date()
      }
    });
    return { success: true, generation: updated, refunded: 0 };
  }
  if (result.success && result.deferred) {
    return { success: true, generation, refunded: 0 }; // leave status as processing; callback will complete
  }
  // Failed or success with no outputUrl (inconsistent)
  const errorMessage = result.error || (!result.outputUrl && result.success ? "No output URL returned" : "Generation failed");
  await prisma.generation.update({
    where: { id: generation.id },
    data: {
      status: 'failed',
      errorMessage: errorMessage
    }
  });

  const refunded = await refundGeneration(generation.id);
  console.log(`❌ Generation failed, refunded ${refunded} credits`);

  return { success: false, error: errorMessage, refunded };
}

/**
 * Unified generation wrapper with safety guarantees
 * Handles: validation, credits, record creation, queue, success/failure, refunds
 * 
 * @param {Object} config - Generation configuration
 * @param {number} config.userId - User ID
 * @param {string} config.modelId - Model ID (optional for some generation types)
 * @param {number} config.creditsNeeded - Credits required
 * @param {Object} config.generationData - Data for createGenerationRecord
 * @param {Function} config.apiCall - Async function that calls the AI API
 * @param {boolean} config.useQueue - Whether to use request queue (default: true)
 * @param {Function} config.validateInput - Optional custom validation function
 * @returns {Promise<Object>} { success, generation?, creditsUsed, creditsRemaining, error?, statusCode? }
 */
export async function withGenerationSafety(config) {
  const {
    userId,
    modelId,
    creditsNeeded,
    generationData,
    apiCall,
    useQueue = true,
    validateInput
  } = config;

  let generation = null;
  let totalRefunds = 0; // Track ALL refunds (immediate + record-based)
  let creditsDeducted = false; // Track if credits were actually deducted

  try {
    // Step 1: Custom validation (if provided)
    if (validateInput) {
      await validateInput();
    }

    // Step 2: Validate model ownership (if modelId provided)
    if (modelId) {
      await validateModelOwnership(modelId, userId);
    }

    // Step 3: Reserve credits upfront (atomic)
    await validateAndReserveCredits(userId, creditsNeeded);
    creditsDeducted = true; // Mark that credits were actually taken

    try {
      // Step 4: Create generation record
      generation = await createGenerationRecord(generationData);

      // Step 5: Execute API call (with or without queue)
      let result;
      if (useQueue) {
        console.log('📋 Adding to request queue...');
        const queueStats = requestQueue.getStats();
        console.log(`Queue: ${queueStats.active}/${queueStats.maxConcurrent} active, ${queueStats.queued} queued`);
        
        result = await requestQueue.enqueue(apiCall);
      } else {
        result = await apiCall();
      }

      // Step 6: Handle result (success or failure with refund)
      const outcome = await handleGenerationResult(generation, result, creditsNeeded);

      if (outcome.success) {
        // Get final credits
        const updatedUser = await checkAndExpireCredits(userId);
        const remainingCredits = getTotalCredits(updatedUser);

        return {
          success: true,
          generation: outcome.generation,
          creditsUsed: creditsNeeded,
          creditsRemaining: remainingCredits
        };
      } else {
        // API failed, already refunded via handleGenerationResult
        totalRefunds += outcome.refunded;
        
        return {
          success: false,
          error: outcome.error,
          creditsUsed: creditsNeeded - totalRefunds, // Accurate billing
          creditsRemaining: getTotalCredits(await checkAndExpireCredits(userId))
        };
      }

    } catch (recordError) {
      // Record created but error during processing
      if (generation && generation.id) {
        // Use atomic refund and track it
        const refunded = await refundGeneration(generation.id);
        totalRefunds += refunded;
        console.log(`💰 Refunded ${refunded} credits (record-based)`);
        
        throw recordError;
      } else {
        // No record created - immediate refund and track it
        await refundCredits(userId, creditsNeeded);
        totalRefunds += creditsNeeded;
        console.log(`💰 Immediate refund: ${creditsNeeded} credits (no record)`);
        
        throw recordError;
      }
    }

  } catch (error) {
    // Emergency catch - ensure no credit loss
    // CRITICAL: Only refund if credits were actually deducted AND we haven't refunded yet
    if (creditsDeducted && !generation && totalRefunds === 0) {
      await refundCredits(userId, creditsNeeded);
      totalRefunds = creditsNeeded;
      console.log(`💰 Emergency refund: ${creditsNeeded} credits`);
    }

    console.error('Generation error:', error);
    
    // If validation failed before deduction, creditsUsed = 0
    const actualCreditsUsed = creditsDeducted ? creditsNeeded - totalRefunds : 0;
    
    // Determine appropriate HTTP status code
    let statusCode = 500; // Default to server error
    if (!creditsDeducted) {
      // Error before credit deduction = client error
      if (error.message?.includes('Need') && error.message?.includes('credits')) {
        statusCode = 403; // Insufficient credits
      } else if (error.message?.includes('not found') || error.message?.includes('unauthorized') || error.message?.includes('Not authorized')) {
        statusCode = 403; // Authorization issue
      } else {
        statusCode = 400; // Validation error
      }
    }
    // If creditsDeducted = true, keep 500 (server error during processing)
    
    return {
      success: false,
      error: error.message || 'Generation failed',
      creditsUsed: actualCreditsUsed, // Accurate: 0 if never deducted, otherwise accounts for refunds
      creditsRemaining: getTotalCredits(await checkAndExpireCredits(userId)),
      statusCode // Hint for controller HTTP response
    };
  }
}
