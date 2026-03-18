export class UserFacingError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "UserFacingError";
    this.statusCode = statusCode;
    this.expose = true;
  }
}

export function getSafeErrorMessage(error, fallback = "Server error") {
  if (error?.expose === true && typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

export function logServerError(context, error) {
  if (error) {
    console.error(`${context}:`, error);
  } else {
    console.error(context);
  }
}
