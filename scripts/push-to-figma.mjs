#!/usr/bin/env node
/**
 * Capture every route × theme of the running ModelClone app and push the
 * captured frames directly into a Figma file via the Figma MCP server's
 * `generate_figma_design` tool.
 *
 * Pipeline:
 *   1. Discover routes from client/src/App.jsx (same parser as figma:export)
 *   2. For each (route × theme), open in Playwright with auth state pre-loaded
 *   3. Inject Figma's capture.js (CSP-stripped per Figma's external-capture pattern)
 *   4. Call window.figma.captureForDesign({captureId, endpoint, selector})
 *   5. The capture POSTs to Figma's submit endpoint, which then lands in your file
 *
 * IMPORTANT: capture IDs and the corresponding submit endpoints come from the
 * MCP tool — this script can't mint them. Run via the AI agent which calls the
 * MCP between iterations, OR provide a captures-manifest JSON up front.
 *
 * Usage:
 *   # Step A: capture auth state (one time, headed)
 *   npm run figma:auth-state -- --base-url https://mdcln-testing.vercel.app
 *
 *   # Step B: drive the captures (agent-managed)
 *   node scripts/push-to-figma.mjs \
 *     --base-url https://mdcln-testing.vercel.app \
 *     --captures-manifest scripts/figma-captures.json \
 *     --themes light,dark
 *
 * The captures-manifest format (one entry per planned capture):
 *   [
 *     { "route": "/", "theme": "light", "captureId": "xxx", "endpoint": "https://mcp.figma.com/mcp/capture/xxx/submit" },
 *     ...
 *   ]
 */

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { chromium } from "playwright";

const cwd = process.cwd();
const args = process.argv.slice(2);

function getArg(flag, fallback = null) {
  const idx = args.indexOf(flag);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}
function hasFlag(flag) {
  return args.includes(flag);
}

const BASE_URL = String(getArg("--base-url", "https://mdcln-testing.vercel.app")).replace(/\/$/, "");
const CAPTURES_MANIFEST = getArg("--captures-manifest", path.join(cwd, "scripts", "figma-captures.json"));
const STORAGE_STATE = getArg("--storage-state", path.join(cwd, "scripts", "figma-auth-state.json"));
const THEMES = String(getArg("--themes", "light,dark"))
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter((s) => s === "light" || s === "dark");
const VIEWPORT_WIDTH = Number(getArg("--width", "1512"));
const VIEWPORT_HEIGHT = Number(getArg("--height", "982"));
const HEADED = hasFlag("--headed");
const PAUSE_MS = Number(getArg("--pause-ms", "2500"));
const ONLY_ROUTE = getArg("--only", null);

const CAPTURE_JS_URL = "https://mcp.figma.com/mcp/html-to-design/capture.js";

async function loadManifest() {
  if (!existsSync(CAPTURES_MANIFEST)) {
    throw new Error(
      `Captures manifest not found at ${CAPTURES_MANIFEST}.\n\n` +
      `This script needs a manifest mapping each (route, theme) pair to a\n` +
      `Figma capture ID + submit endpoint. The IDs are minted by the Figma MCP\n` +
      `'generate_figma_design' tool — the AI agent driving this script must\n` +
      `produce the manifest before running.`,
    );
  }
  const raw = await fs.readFile(CAPTURES_MANIFEST, "utf8");
  return JSON.parse(raw);
}

async function fetchCaptureScript() {
  const res = await fetch(CAPTURE_JS_URL);
  if (!res.ok) throw new Error(`Failed to fetch capture.js: HTTP ${res.status}`);
  return res.text();
}

async function seedTheme(context, theme) {
  await context.addInitScript(
    ({ theme }) => {
      try {
        localStorage.setItem("mc-theme", theme);
        const html = document.documentElement;
        html.classList.remove("light", "dark");
        html.classList.add(theme);
        html.setAttribute("data-theme", theme);
        const pageBg = theme === "light" ? "#eef1f7" : "#050505";
        html.style.background = pageBg;
        if (document.body) document.body.style.background = pageBg;
      } catch {}
    },
    { theme },
  );
}

async function captureOne(page, captureScript, { url, captureId, endpoint }) {
  // Strip CSP so we can inject the capture script regardless of headers.
  await page.context().route("**/*", async (route) => {
    try {
      const response = await route.fetch();
      const headers = { ...response.headers() };
      delete headers["content-security-policy"];
      delete headers["content-security-policy-report-only"];
      await route.fulfill({ response, headers });
    } catch (err) {
      await route.abort().catch(() => {});
    }
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(PAUSE_MS);

  // Wait for fonts to settle so captured layout is stable.
  try {
    await page.evaluate(() => document.fonts && document.fonts.ready);
  } catch {}

  // Inject and run capture.js
  await page.evaluate((src) => {
    const el = document.createElement("script");
    el.textContent = src;
    document.head.appendChild(el);
  }, captureScript);

  // capture.js exposes window.figma.captureForDesign
  await page.waitForFunction(() => Boolean(window.figma && window.figma.captureForDesign), { timeout: 10_000 });

  // captureForDesign POSTs to Figma's submit endpoint but its returned promise
  // doesn't always resolve cleanly even after the data lands. Race against a
  // generous timeout — the MCP poll is the source of truth for success.
  const result = await Promise.race([
    page.evaluate(
      ({ captureId, endpoint }) =>
        window.figma.captureForDesign({
          captureId,
          endpoint,
          selector: "body",
        }),
      { captureId, endpoint },
    ),
    new Promise((resolve) => setTimeout(() => resolve({ submitted: true, timedOut: true }), 25_000)),
  ]);

  // Give the network a moment to flush before we navigate away.
  await page.waitForTimeout(2_000);

  // Best-effort cleanup
  await page.context().unroute("**/*").catch(() => {});

  return result;
}

async function run() {
  const manifest = await loadManifest();
  if (!Array.isArray(manifest) || manifest.length === 0) {
    console.error("Manifest is empty — nothing to capture.");
    process.exit(1);
  }

  const filtered = manifest.filter((entry) => {
    if (!THEMES.includes(entry.theme)) return false;
    if (ONLY_ROUTE && entry.route !== ONLY_ROUTE) return false;
    return true;
  });

  if (!filtered.length) {
    console.error("No manifest entries matched filters.");
    process.exit(1);
  }

  console.log("──────────────────────────────────────────────────────────");
  console.log(" Figma push pipeline");
  console.log(`   base URL  : ${BASE_URL}`);
  console.log(`   manifest  : ${CAPTURES_MANIFEST} (${filtered.length} captures)`);
  console.log(`   themes    : ${THEMES.join(", ")}`);
  console.log(`   auth state: ${existsSync(STORAGE_STATE) ? STORAGE_STATE : "(none — public-only)"}`);
  console.log(`   headed    : ${HEADED}`);
  console.log("──────────────────────────────────────────────────────────\n");

  const captureScript = await fetchCaptureScript();
  const browser = await chromium.launch({ headless: !HEADED });

  const ok = [];
  const failed = [];

  // Group by theme so we don't recreate context per route.
  const byTheme = new Map();
  for (const entry of filtered) {
    if (!byTheme.has(entry.theme)) byTheme.set(entry.theme, []);
    byTheme.get(entry.theme).push(entry);
  }

  for (const [theme, entries] of byTheme.entries()) {
    const contextOpts = {
      viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
      colorScheme: theme === "dark" ? "dark" : "light",
    };
    if (existsSync(STORAGE_STATE)) contextOpts.storageState = STORAGE_STATE;

    const context = await browser.newContext(contextOpts);
    await seedTheme(context, theme);
    const page = await context.newPage();

    for (const entry of entries) {
      const url = `${BASE_URL}${entry.route.startsWith("/") ? "" : "/"}${entry.route}`;
      process.stdout.write(`  ${theme.padEnd(5)} ${entry.route.padEnd(40)} → `);
      try {
        const result = await captureOne(page, captureScript, {
          url,
          captureId: entry.captureId,
          endpoint: entry.endpoint,
        });
        ok.push({ ...entry, result });
        console.log("submitted ✓");
      } catch (err) {
        failed.push({ ...entry, error: err?.message || String(err) });
        console.log(`FAIL — ${err?.message?.slice(0, 80) || "unknown"}`);
      }
      // Be gentle on the Figma backend / let UI settle between captures.
      await page.waitForTimeout(1500);
    }

    await context.close();
  }

  await browser.close();

  const outPath = path.join(path.dirname(CAPTURES_MANIFEST), "figma-captures-result.json");
  await fs.writeFile(
    outPath,
    JSON.stringify({ submittedAt: new Date().toISOString(), ok, failed }, null, 2),
    "utf8",
  );

  console.log(`\nDone. Submitted ${ok.length}, failed ${failed.length}.`);
  console.log(`Result manifest: ${outPath}`);
  console.log(
    `\nNext: the AI agent driving this should now poll the Figma MCP\n` +
    `'generate_figma_design' tool with each captureId until status='completed'.`,
  );
}

run().catch((err) => {
  console.error("\nPipeline error:", err);
  process.exit(1);
});
