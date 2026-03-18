import { body, validationResult } from 'express-validator';

/**
 * Allowed URL domains for image/video uploads (SSRF prevention)
 * Only allow trusted sources like Cloudinary, our own uploads, etc.
 */
const ALLOWED_URL_DOMAINS = [
  'res.cloudinary.com',
  'cloudinary.com',
  'replicate.delivery',
  'replicate.com',
  'pbxt.replicate.delivery',
  'wavespeed.ai',
  'api.wavespeed.ai',
  'storage.googleapis.com',
  'amazonaws.com',
  's3.amazonaws.com',
  'cloudfront.net',
  'r2.dev',
  'r2.cloudflarestorage.com',
  'blob.vercel-storage.com', // Vercel Blob (e.g. *.public.blob.vercel-storage.com)
  'kie.ai',
  'fal.media',
  'fal.run',
  'runpod.io',
];

/**
 * Custom validator to check if URL is from allowed domain
 * Prevents SSRF attacks by only allowing trusted image/video sources
 */
const isAllowedUrl = (url) => {
  if (!url) return true; // Optional URLs are OK
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_URL_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false; // Invalid URL
  }
};

/**
 * Validation error handler
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Signup validation rules
 */
export const validateSignup = [
  body('email')
    .trim()
    .isEmail().withMessage('Invalid email address')
    .toLowerCase() // Case-insensitive but preserves dots
    .isLength({ max: 255 }).withMessage('Email too long'),
  
  body('password')
    .trim()
    .isLength({ min: 6, max: 128 }).withMessage('Password must be 6-128 characters')
    .matches(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/).withMessage('Password contains invalid characters'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Name too long')
    .matches(/^[\p{L}\p{M}0-9\s\-'\.]+$/u).withMessage('Please use only letters, numbers, spaces, and basic punctuation')
    .escape(), // Prevent XSS
  
  body('deviceFingerprint')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 }).withMessage('Invalid device verification'),
  
  body('userAgent')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('User agent too long'),
  
  body('referralCode')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 4, max: 30 }).withMessage('Referral code must be 4-30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Referral code contains invalid characters'),
  
  handleValidationErrors
];

/**
 * Login validation rules
 */
export const validateLogin = [
  body('email')
    .trim()
    .isEmail().withMessage('Invalid email address')
    .toLowerCase(), // Case-insensitive matching
  
  body('password')
    .trim()
    .notEmpty().withMessage('Password required'),
  
  body('twoFactorCode')
    .optional()
    .trim()
    .isLength({ min: 6, max: 6 }).withMessage('2FA code must be 6 digits')
    .isNumeric().withMessage('2FA code must be numeric'),
  
  handleValidationErrors
];

/**
 * Email verification validation
 */
export const validateEmailVerification = [
  body('email')
    .trim()
    .isEmail().withMessage('Invalid email address')
    .toLowerCase(),
  
  body('code')
    .trim()
    .isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits')
    .isNumeric().withMessage('Code must be numeric'),
  
  handleValidationErrors
];

/**
 * Resend code validation
 */
export const validateResendCode = [
  body('email')
    .trim()
    .isEmail().withMessage('Invalid email address')
    .toLowerCase(),
  
  handleValidationErrors
];

/**
 * Password reset request validation
 */
export const validatePasswordResetRequest = [
  body('email')
    .trim()
    .isEmail().withMessage('Invalid email address')
    .toLowerCase(),
  
  handleValidationErrors
];

/**
 * Password reset validation
 */
export const validatePasswordReset = [
  body('email')
    .trim()
    .isEmail().withMessage('Invalid email address')
    .toLowerCase(),
  
  body('code')
    .trim()
    .isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits')
    .isNumeric().withMessage('Code must be numeric'),
  
  body('newPassword')
    .trim()
    .isLength({ min: 6, max: 128 }).withMessage('Password must be 6-128 characters'),
  
  handleValidationErrors
];

/**
 * Model creation validation
 */
export const validateModelCreation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Model name must be 1-100 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.]*$/).withMessage('Model name contains invalid characters')
    .escape(),
  
  body('photo1Url')
    .trim()
    .isURL().withMessage('Invalid photo 1 URL')
    .isLength({ max: 1000 }).withMessage('URL too long'),
  
  body('photo2Url')
    .trim()
    .isURL().withMessage('Invalid photo 2 URL')
    .isLength({ max: 1000 }).withMessage('URL too long'),
  
  body('photo3Url')
    .trim()
    .isURL().withMessage('Invalid photo 3 URL')
    .isLength({ max: 1000 }).withMessage('URL too long'),
  
  handleValidationErrors
];

/**
 * Model update validation (all fields optional)
 */
export const validateModelUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Model name must be 1-100 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.]*$/).withMessage('Model name contains invalid characters')
    .escape(),
  
  body('photo1Url')
    .optional()
    .trim()
    .isURL().withMessage('Invalid photo 1 URL')
    .isLength({ max: 1000 }).withMessage('URL too long'),
  
  body('photo2Url')
    .optional()
    .trim()
    .isURL().withMessage('Invalid photo 2 URL')
    .isLength({ max: 1000 }).withMessage('URL too long'),
  
  body('photo3Url')
    .optional()
    .trim()
    .isURL().withMessage('Invalid photo 3 URL')
    .isLength({ max: 1000 }).withMessage('URL too long'),

  body('age')
    .optional({ values: 'null' })
    .isInt({ min: 1, max: 120 }).withMessage('Age must be between 1 and 120'),
  
  handleValidationErrors
];

/**
 * Generation validation (with URL whitelist for SSRF prevention)
 */
export const validateGeneration = [
  body('prompt')
    .optional()
    .trim()
    .isLength({ max: 3000 }).withMessage('Prompt too long'),
  
  // Validate all common URL fields used in generation requests
  body('targetImage')
    .optional()
    .trim()
    .isURL().withMessage('Invalid target image URL')
    .custom(isAllowedUrl).withMessage('Image URL must be from a trusted source (Cloudinary, etc.)'),
  
  body('sourceImage')
    .optional()
    .trim()
    .isURL().withMessage('Invalid source image URL')
    .custom(isAllowedUrl).withMessage('Image URL must be from a trusted source'),
  
  body('faceImage')
    .optional()
    .trim()
    .isURL().withMessage('Invalid face image URL')
    .custom(isAllowedUrl).withMessage('Image URL must be from a trusted source'),
  
  body('videoUrl')
    .optional()
    .trim()
    .isURL().withMessage('Invalid video URL')
    .custom(isAllowedUrl).withMessage('Video URL must be from a trusted source'),
  
  body('referenceVideoUrl')
    .optional()
    .trim()
    .isURL().withMessage('Invalid reference video URL')
    .custom(isAllowedUrl).withMessage('Video URL must be from a trusted source'),
  
  body('imageUrl')
    .optional()
    .trim()
    .isURL().withMessage('Invalid image URL')
    .custom(isAllowedUrl).withMessage('Image URL must be from a trusted source'),
  
  // Validate identity images array
  body('identityImages')
    .optional()
    .isArray().withMessage('Identity images must be an array')
    .custom((arr) => {
      if (!arr) return true;
      return arr.every(url => isAllowedUrl(url));
    }).withMessage('All identity images must be from trusted sources'),
  
  body('identityImages.*')
    .optional()
    .trim()
    .isURL().withMessage('Invalid identity image URL'),
  
  handleValidationErrors
];
