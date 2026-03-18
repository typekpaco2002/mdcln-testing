/**
 * Optimistic Generation Helper
 * 
 * Creates temporary generation cards and dispatches events for instant UI feedback.
 * Handles type normalization and localStorage mapping management.
 * 
 * v47: Universal fix for duplicate cards - all generation types use this helper
 */

/**
 * Normalize generation type to canonical form
 * Prevents event name mismatches and duplicate cards
 * 
 * @param {string} type - Raw generation type
 * @returns {string} Canonical type name
 */
export function normalizeType(type) {
  const typeMap = {
    'faceswap': 'face-swap',
    'face-swap-image': 'image', // v47 FIX: Image face swap should match image history
    'face-swap-video': 'face-swap',
    'prompt-based': 'prompt-image',
    'prompt': 'prompt-image',
    'video-motion': 'video',
    'video-quick': 'video',
    'prompt-video': 'prompt-video',
  };

  return typeMap[type] || type;
}

/**
 * Create optimistic generation(s) and dispatch events
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.type - Generation type (will be normalized)
 * @param {number} config.quantity - Number of generations to create (default: 1)
 * @param {Object} config.data - Additional data for the generation (prompt, duration, etc.)
 * @returns {Array} Array of temporary generation objects
 */
export function createOptimisticGenerations({ type, quantity = 1, data = {} }) {
  const canonicalType = normalizeType(type);
  const timestamp = Date.now();

  // Create temp generations
  const tempGenerations = Array.from({ length: quantity }, (_, i) => ({
    id: `temp-${canonicalType}-${timestamp}-${i}`,
    type: canonicalType,
    status: 'processing',
    outputUrl: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    ...data, // Include prompt, duration, or other metadata
  }));

  // Dispatch events for each temp generation
  tempGenerations.forEach((gen) => {
    console.log(`🚀 Dispatching optimistic update (${canonicalType}):`, gen.id);
    window.dispatchEvent(
      new CustomEvent(`optimistic-generation-update-${canonicalType}`, {
        detail: gen,
      })
    );
  });

  return tempGenerations;
}

/**
 * Store temp ID → real ID mappings in localStorage
 * Called after API response with real generation IDs
 * 
 * @param {Array} tempGenerations - Array of temp generation objects
 * @param {Array} realGenerations - Array of real generation objects from backend
 */
export function storeMappings(tempGenerations, realGenerations) {
  if (!Array.isArray(tempGenerations) || !Array.isArray(realGenerations)) {
    console.warn('⚠️ storeMappings: Invalid input', { tempGenerations, realGenerations });
    return;
  }

  const mappings = JSON.parse(localStorage.getItem('tempToRealMapping') || '{}');
  
  realGenerations.forEach((realGen, index) => {
    if (tempGenerations[index] && realGen.id) {
      mappings[tempGenerations[index].id] = realGen.id;
      console.log(`🗺️ Mapping stored: ${tempGenerations[index].id} → ${realGen.id}`);
    }
  });

  localStorage.setItem('tempToRealMapping', JSON.stringify(mappings));
  console.log(`✅ Stored ${realGenerations.length} mapping(s)`);
}

/**
 * Get canonical type for event listening
 * Use this in GenerationHistory to ensure consistent event names
 * 
 * @param {string} type - Raw type from component prop
 * @returns {string} Canonical type for event name
 */
export function getCanonicalType(type) {
  return normalizeType(type);
}
