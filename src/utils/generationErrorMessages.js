/**
 * Map provider/API error messages to user-friendly text for generation failures.
 */
export function getUserFriendlyGenerationError(rawMessage) {
  if (!rawMessage || typeof rawMessage !== "string") return rawMessage || "Generation failed";

  // Strip internal provider names
  const sanitized = rawMessage
    .replace(/kie generation failed:\s*/gi, "")
    .replace(/kie\.ai\s*/gi, "")
    .replace(/wavespeed\s*/gi, "")
    .replace(/runpod\s*/gi, "")
    .replace(/fal\.ai\s*/gi, "")
    .replace(/xai\s*/gi, "")
    .replace(/x\.ai\s*/gi, "")
    .replace(/elevenlabs\s*/gi, "")
    .replace(/openrouter\s*/gi, "")
    .replace(/replicate\s*/gi, "")
    .trim();
  const lower = sanitized.toLowerCase();

  // Content policy / NSFW
  if (
    lower.includes("content policy") ||
    lower.includes("content safety") ||
    lower.includes("blocked") ||
    lower.includes("not allowed") ||
    lower.includes("inappropriate") ||
    lower.includes("nsfw") ||
    lower.includes("explicit") ||
    lower.includes("safety") ||
    lower.includes("moderation") ||
    lower.includes("violation") ||
    lower.includes("rejected") ||
    lower.includes("prohibited") ||
    lower.includes("restricted")
  ) {
    return "This prompt or image was rejected (content policy). This mode doesn't support explicit or restricted content. Try Uncensored+ or rephrase for SFW.";
  }

  // Transient server overload (already retried 3x by the time this shows)
  if (
    lower.includes("busy") ||
    lower.includes("server issue") ||
    lower.includes("overload") ||
    lower.includes("capacity") ||
    lower.includes("unavailable") ||
    lower.includes("rate limit") ||
    lower.includes("429")
  ) {
    return "Generation service is temporarily busy. Your credits have been refunded — please try again in a moment.";
  }

  // Timeout
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Generation timed out. Your credits have been refunded — please try again.";
  }

  // Generic server error
  if (lower.includes("internal") || lower.includes("server error") || lower.includes("http 5")) {
    return "Generation failed due to a server issue. Your credits have been refunded — please try again.";
  }

  return sanitized || "Generation failed. Your credits have been refunded — please try again.";
}
