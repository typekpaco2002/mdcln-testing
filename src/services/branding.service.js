import prisma from "../lib/prisma.js";
import { BRAND } from "../utils/brand.js";

const BRANDING_ID = "global";

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) return null;
  return raw;
}

const DEFAULT_TUTORIAL_VIDEO_URL = "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/static/dashboard_video.mp4";

export async function getAppBranding() {
  // Try with tutorialVideoUrl first; fall back if the column hasn't been migrated yet (P2022)
  try {
    const record = await prisma.appBranding.findUnique({
      where: { id: BRANDING_ID },
      select: { appName: true, logoUrl: true, faviconUrl: true, baseUrl: true, tutorialVideoUrl: true },
    });
    return {
      appName: record?.appName || BRAND.name,
      logoUrl: record?.logoUrl || null,
      faviconUrl: record?.faviconUrl || record?.logoUrl || null,
      baseUrl: record?.baseUrl || BRAND.defaultBaseUrl,
      tutorialVideoUrl: record?.tutorialVideoUrl || DEFAULT_TUTORIAL_VIDEO_URL,
    };
  } catch (err) {
    if (err?.code === "P2022") {
      // Column not yet added via migration — degrade gracefully
      console.warn("[branding] tutorialVideoUrl column missing in DB. Run: ALTER TABLE \"AppBranding\" ADD COLUMN IF NOT EXISTS \"tutorialVideoUrl\" TEXT;");
      const record = await prisma.appBranding.findUnique({
        where: { id: BRANDING_ID },
        select: { appName: true, logoUrl: true, faviconUrl: true, baseUrl: true },
      });
      return {
        appName: record?.appName || BRAND.name,
        logoUrl: record?.logoUrl || null,
        faviconUrl: record?.faviconUrl || record?.logoUrl || null,
        baseUrl: record?.baseUrl || BRAND.defaultBaseUrl,
        tutorialVideoUrl: DEFAULT_TUTORIAL_VIDEO_URL,
      };
    }
    throw err;
  }
}

export async function updateAppBranding(input = {}) {
  const appName = String(input.appName || "").trim();
  if (!appName) {
    throw new Error("App name is required");
  }

  const logoUrl = normalizeUrl(input.logoUrl);
  const faviconUrl = normalizeUrl(input.faviconUrl);
  const baseUrl = normalizeUrl(input.baseUrl);
  const tutorialVideoUrl = normalizeUrl(input.tutorialVideoUrl);

  try {
    const updated = await prisma.appBranding.upsert({
      where: { id: BRANDING_ID },
      create: { id: BRANDING_ID, appName, logoUrl, faviconUrl, baseUrl, tutorialVideoUrl },
      update: { appName, logoUrl, faviconUrl, baseUrl, tutorialVideoUrl },
      select: { appName: true, logoUrl: true, faviconUrl: true, baseUrl: true, tutorialVideoUrl: true },
    });
    return {
      appName: updated.appName,
      logoUrl: updated.logoUrl || null,
      faviconUrl: updated.faviconUrl || updated.logoUrl || null,
      baseUrl: updated.baseUrl || BRAND.defaultBaseUrl,
      tutorialVideoUrl: updated.tutorialVideoUrl || DEFAULT_TUTORIAL_VIDEO_URL,
    };
  } catch (err) {
    if (err?.code === "P2022") {
      // tutorialVideoUrl column missing — save without it
      console.warn("[branding] tutorialVideoUrl column missing, saving without it.");
      const updated = await prisma.appBranding.upsert({
        where: { id: BRANDING_ID },
        create: { id: BRANDING_ID, appName, logoUrl, faviconUrl, baseUrl },
        update: { appName, logoUrl, faviconUrl, baseUrl },
        select: { appName: true, logoUrl: true, faviconUrl: true, baseUrl: true },
      });
      return {
        appName: updated.appName,
        logoUrl: updated.logoUrl || null,
        faviconUrl: updated.faviconUrl || updated.logoUrl || null,
        baseUrl: updated.baseUrl || BRAND.defaultBaseUrl,
        tutorialVideoUrl: DEFAULT_TUTORIAL_VIDEO_URL,
      };
    }
    throw err;
  }
}

export async function clearTutorialVideo() {
  try {
    await prisma.appBranding.upsert({
      where: { id: BRANDING_ID },
      create: { id: BRANDING_ID, appName: BRAND.name, tutorialVideoUrl: null },
      update: { tutorialVideoUrl: null },
    });
  } catch (err) {
    if (err?.code === "P2022") {
      console.warn("[branding] tutorialVideoUrl column missing — skipping clearTutorialVideo.");
      return;
    }
    throw err;
  }
}
