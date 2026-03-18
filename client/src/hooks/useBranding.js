import { useMemo } from "react";
import { LOCAL_BRANDING } from "../config/branding";

/**
 * Returns branding from local config only. No API/DB call — avoids crashes when
 * branding isn't in the database (e.g. local dev or fresh deploy).
 */
export function useBranding() {
  return useMemo(
    () => ({
      appName: LOCAL_BRANDING.appName || "ModelClone",
      logoUrl: LOCAL_BRANDING.logoUrl || "/logo-512.png",
      faviconUrl: LOCAL_BRANDING.faviconUrl || LOCAL_BRANDING.logoUrl || "/logo-512.png",
      baseUrl: LOCAL_BRANDING.baseUrl || "https://modelclone.app",
    }),
    [],
  );
}
