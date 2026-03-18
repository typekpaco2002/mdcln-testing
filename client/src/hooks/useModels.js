import rateLimit from "express-rate-limit";

// Aggressive rate limiting for auth endpoints (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    success: false,
    message:
      "Too many authentication attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count successful logins too to prevent spam
});

// Moderate rate limiting for signup (prevent mass account creation)
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 signups per hour per IP (allows shared IPs like schools/offices)
  message: {
    success: false,
    message: "Too many accounts created. Please try again in 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset rate limiting (prevent abuse)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: {
    success: false,
    message: "Too many password reset requests. Please try again in 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generation endpoint rate limiting (prevent spam generations)
export const generationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 generations per minute per user
  message: {
    success: false,
    message: "Too many generation requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count ALL requests (successful or not)
  keyGenerator: (req) => {
    // Use user ID for authenticated requests
    // authMiddleware attaches req.user = { userId, email }
    // If no user, return undefined to use default IP-based limiting
    return req.user?.userId ? `user:${req.user.userId}` : undefined;
  },
});

// ✅ FIX: New rate limiter specifically for /models endpoint
// This prevents 429 errors when multiple components load models simultaneously
export const modelsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // ✅ FIX: 30 requests per minute (allows multiple components + some refreshes)
  message: {
    success: false,
    message: "Too many model requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use user ID for authenticated requests
    return req.user?.userId ? `user:${req.user.userId}` : undefined;
  },
});

// General API rate limiter (catch-all protection)
// ✅ FIX: Increased from 100 to 200 to accommodate React Query polling
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // ✅ FIX: Increased from 100 to 200 requests per 15 minutes
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
