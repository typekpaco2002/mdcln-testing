import FingerprintJS from '@fingerprintjs/fingerprintjs';

/**
 * Generate a unique browser fingerprint
 * Uses FingerprintJS open-source library to collect device characteristics
 * 
 * @returns {Promise<Object>} Fingerprint data including visitorId, userAgent, timezone
 */
export async function generateFingerprint() {
  try {
    // Load FingerprintJS agent (uses canvas, WebGL, audio, fonts, etc.)
    const fp = await FingerprintJS.load();
    
    // Get the visitor identifier
    const result = await fp.get();
    
    // Collect additional browser data
    const fingerprint = {
      visitorId: result.visitorId,
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      platform: navigator.platform,
      // Send confidence score if available
      confidence: result.confidence?.score || null,
    };
    
    return fingerprint;
  } catch (error) {
    // Enhanced logging for debugging fingerprint failures
    console.warn('⚠️ FingerprintJS failed, using fallback:', {
      error: error.message,
      errorType: error.name,
      userAgent: navigator.userAgent?.substring(0, 50) + '...',
      browserSupport: {
        canvas: !!document.createElement('canvas').getContext,
        webgl: !!document.createElement('canvas').getContext('webgl'),
        audio: typeof AudioContext !== 'undefined'
      }
    });
    
    // Fallback: Generate basic fingerprint from available data
    const fallbackId = btoa(
      `${navigator.userAgent}|${window.screen.width}x${window.screen.height}|${navigator.language}`
    ).substring(0, 32);
    
    return {
      visitorId: fallbackId,
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      platform: navigator.platform,
      confidence: null,
      isFallback: true
    };
  }
}

/**
 * Validate fingerprint has sufficient entropy
 * Prevents simple spoofing attempts
 * 
 * @param {string} visitorId - The fingerprint ID to validate
 * @returns {boolean} True if fingerprint has enough uniqueness
 */
export function validateFingerprintEntropy(visitorId) {
  if (!visitorId || typeof visitorId !== 'string') {
    return false;
  }
  
  // Must be at least 8 characters
  if (visitorId.length < 8) {
    return false;
  }
  
  // Count unique characters
  const uniqueChars = new Set(visitorId).size;
  
  // Require at least 5 unique characters (prevents "aaaaaaaa" type spoofing)
  return uniqueChars >= 5;
}
