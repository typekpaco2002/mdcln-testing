export const BRAND = {
  name: "ModelClone",
  defaultBaseUrl: "https://modelclone.app",
  logoPath: "/logo-512.png",
  supportEmail: "support@modelclone.app",
};

export function getBrandBaseUrl() {
  const raw = process.env.FRONTEND_URL || BRAND.defaultBaseUrl;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function getBrandLogoUrl() {
  return `${getBrandBaseUrl()}${BRAND.logoPath}`;
}

