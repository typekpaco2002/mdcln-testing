/**
 * Sanitize API/provider errors for user-facing responses.
 * - Removes provider names (KIE, WaveSpeed, etc.)
 * - Returns a short message + a solution for every error
 */

const PROVIDER_NAMES = /\bKIE\b|WaveSpeed|kie\.ai|wavespeed\.ai/gi;

function stripProviderNames(text) {
  if (!text || typeof text !== "string") return "";
  return text.replace(PROVIDER_NAMES, "AI service").trim();
}

/**
 * Map raw error message to user-facing { message, solution }.
 * Never exposes provider names; every error includes a solution.
 */
export function toUserError(rawMessage) {
  const msg = String(rawMessage || "").trim();
  const lower = msg.toLowerCase();

  // Resolution / parameter validation
  if (/resolution.*not within|not within.*range|allowed options/i.test(msg)) {
    return {
      message: "Image quality setting was invalid.",
      solution: "We've updated the allowed options. Please try again.",
    };
  }

  // Auth / config
  if (/401|unauthorized|invalid.*api.*key|not configured/i.test(lower)) {
    return {
      message: "AI service is not configured or the key is invalid.",
      solution: "Please contact support to fix this.",
    };
  }

  // Unreachable images / blob not found
  if (/blob not found|failed to fetch|econnrefused|getaddrinfo|unreachable|could not be reached/i.test(lower)) {
    return {
      message: "Reference images could not be reached by the AI.",
      solution: "Please re-upload your photos and try again.",
    };
  }

  // Timeout
  if (/timeout|timed out|took too long/i.test(lower)) {
    return {
      message: "The request took too long.",
      solution: "Please try again in a few minutes.",
    };
  }

  // Rate limit
  if (/rate limit|too many requests|429/i.test(lower)) {
    return {
      message: "Too many requests at once.",
      solution: "Please wait a minute and try again.",
    };
  }

  // Content policy / moderation
  if (/nsfw|explicit|moderation|content policy|not allowed|blocked|rejected|inappropriate/i.test(lower)) {
    return {
      message: "Your content was flagged and cannot be processed.",
      solution: "Please use different images or a different description and try again.",
    };
  }

  // Server/API 5xx
  if (/500|502|503|server error|internal error/i.test(lower)) {
    return {
      message: "The AI service had a temporary problem.",
      solution: "Please try again in a few minutes. If it keeps happening, contact support.",
    };
  }

  // Generic: sanitize and cap length, always add solution
  const sanitized = stripProviderNames(msg);
  const short = sanitized.length > 180 ? sanitized.slice(0, 177) + "…" : sanitized;
  return {
    message: short || "Something went wrong.",
    solution: "Please try again. If it keeps happening, contact support.",
  };
}

/**
 * Return a single user-safe error string for storing in DB (e.g. Generation.errorMessage).
 * Strips provider names and applies same mappings as toUserError; max 500 chars.
 */
export function getErrorMessageForDb(rawMessage) {
  const { message } = toUserError(rawMessage);
  const out = (message || "Something went wrong.").trim();
  return out.length > 500 ? out.slice(0, 497) + "…" : out;
}
