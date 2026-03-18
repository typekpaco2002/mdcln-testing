import prisma from "../lib/prisma.js";
import crypto from "crypto";

/**
 * Hash fingerprint with server secret (stable, IP-independent)
 * Prevents fingerprint replay but allows tracking across IP changes
 *
 * @param {string} visitorId - Raw fingerprint from client
 * @returns {string} Stable hash
 */
export function hashFingerprintForStorage(visitorId) {
  // Create stable hash with server secret only
  // Do NOT include IP or time-based salt to allow cross-IP tracking
  const salt = process.env.JWT_SECRET || "fallback-secret";

  // Create SHA256 hash
  const hash = crypto
    .createHash("sha256")
    .update(`${visitorId}|${salt}`)
    .digest("hex");

  return hash;
}

/**
 * Validate fingerprint entropy to prevent simple spoofing
 *
 * @param {string} visitorId - Fingerprint to validate
 * @returns {boolean} True if valid
 */
function validateEntropy(visitorId) {
  if (!visitorId || typeof visitorId !== "string") {
    return false;
  }

  // Must be at least 8 characters
  if (visitorId.length < 8) {
    return false;
  }

  // Count unique characters
  const uniqueChars = new Set(visitorId).size;

  // Require at least 5 unique characters
  return uniqueChars >= 5;
}

/**
 * Calculate free credits based on fingerprint/IP abuse history
 *
 * First signup: 0 credits
 * Repeat signup: 0 credits (no free credits)
 *
 * @param {string} visitorId - Browser fingerprint
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Browser user agent
 * @param {string} email - User email
 * @returns {Promise<{credits: number, reason: string, previousAttempts: number}>}
 */
export async function calculateFreeCredits(
  visitorId,
  ipAddress,
  userAgent,
  email,
) {
  try {
    // Validate entropy
    if (!validateEntropy(visitorId)) {
      console.warn(`Low entropy fingerprint detected: ${visitorId}`);
      // Still allow signup but give no credits
      return {
        credits: 0,
        reason: "Low entropy fingerprint (suspected spoofing)",
        previousAttempts: 999,
      };
    }

    // Hash the fingerprint for storage (stable, IP-independent)
    const fingerprintHash = hashFingerprintForStorage(visitorId);

    // Check fingerprint history (tracks same device across IP changes)
    const fingerprintAttempts = await prisma.signupFingerprint.count({
      where: { deviceFingerprint: fingerprintHash },
    });

    // Check IP history (tracks signups from same network)
    const ipAttempts = await prisma.signupFingerprint.count({
      where: { ipAddress },
    });

    // Use the HIGHER count for abuse detection
    // This catches both device reuse AND IP reuse
    const previousAttempts = Math.max(fingerprintAttempts, ipAttempts);

    // No free credits on signup (first or repeat)
    let credits;
    let reason;

    if (previousAttempts === 0) {
      credits = 0;
      reason = "First signup - no free credits";
    } else {
      credits = 0;
      reason = `Duplicate signup detected (${previousAttempts} previous signup${previousAttempts > 1 ? "s" : ""})`;
    }

    // Log this signup attempt (stores both IP and fingerprint separately)
    await prisma.signupFingerprint.create({
      data: {
        ipAddress,
        deviceFingerprint: fingerprintHash, // Stable hash
        userAgent,
        email,
        freeCreditsGiven: credits > 0,
      },
    });

    console.log(
      `📍 Fingerprint: ${email} | FP: ${fingerprintAttempts} | IP: ${ipAttempts} | Credits: ${credits}`,
    );

    return {
      credits,
      reason,
      previousAttempts,
    };
  } catch (error) {
    console.error("Error calculating free credits:", error);

    // Fallback to no credits on error (safe default)
    return {
      credits: 0,
      reason: "Error during fingerprint validation",
      previousAttempts: 0,
    };
  }
}

/**
 * Get fingerprint abuse statistics for admin dashboard
 *
 * @returns {Promise<Object>} Stats about signup fingerprints
 */
export async function getFingerprintStats() {
  try {
    const totalSignups = await prisma.signupFingerprint.count();

    // Get unique IPs
    const uniqueIPs = await prisma.signupFingerprint.groupBy({
      by: ["ipAddress"],
      _count: true,
    });

    // Get unique fingerprints
    const uniqueFingerprints = await prisma.signupFingerprint.groupBy({
      by: ["deviceFingerprint"],
      _count: true,
    });

    // Find repeat offenders (3+ signups)
    const repeatOffenders =
      uniqueIPs.filter((ip) => ip._count >= 3).length +
      uniqueFingerprints.filter((fp) => fp._count >= 3).length;

    return {
      totalSignups,
      uniqueIPs: uniqueIPs.length,
      uniqueFingerprints: uniqueFingerprints.length,
      repeatOffenders,
      averageSignupsPerIP: totalSignups / (uniqueIPs.length || 1),
    };
  } catch (error) {
    console.error("Error getting fingerprint stats:", error);
    return null;
  }
}
