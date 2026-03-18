// All assets are served from R2 — no transform needed.
// These functions are kept for backward compatibility.

export function getOptimizedCloudinaryUrl(url) {
  return url || '';
}

export function getThumbnailUrl(url) {
  if (!url || typeof url !== 'string') return '';
  // Reject placeholder strings that are not real URLs
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) return '';
  return url;
}

export function getMediumUrl(url) {
  return url || '';
}

export function getLargeUrl(url) {
  return url || '';
}
