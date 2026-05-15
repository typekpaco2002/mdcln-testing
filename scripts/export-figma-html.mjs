#!/usr/bin/env node
/**
 * Figma HTML exporter (Option 2 — code-to-Figma reproducible pipeline).
 *
 * What this does:
 *   1. Auto-discovers every <Route path="..."> in client/src/App.jsx
 *      (no need to maintain scripts/figma-export-routes.json by hand)
 *   2. For each route, renders the SPA TWICE — once in light theme, once in dark
 *   3. Mocks every /api/** request with deterministic JSON fixtures from
 *      scripts/figma-export-fixtures/ (no DATABASE_URL needed)
 *   4. Writes one HTML snapshot + preview screenshot per (route, theme)
 *
 * Usage:
 *   npm run figma:export        # public routes only
 *   npm run figma:export:full   # public + auth + admin (no DB needed thanks to mocks)
 *
 * Flags (raw script):
 *   --base-url <url>          Default http://localhost:5000
 *   --routes-file <path>      Optional override: hand-curated route list
 *   --out-dir <path>          Default figma-static/export-<timestamp>
 *   --width <px>              Default 1512
 *   --height <px>             Default 982
 *   --themes <list>           Default "light,dark" (comma-sep)
 *   --include-auth            Also render protected/admin routes (mocks supply a fake admin user)
 *   --skip-mocks              Don't intercept /api/** (useful with a real backend + storage state)
 *   --storage-state <path>    Playwright storage state JSON (only relevant with --skip-mocks)
 *   --pause-ms <n>            Default 1200 (post-load wait for hydration)
 *   --wait-until <ev>         Default networkidle
 *   --routes <list>           Comma-sep allowlist (e.g. "/dashboard,/nsfw")
 *   --skip-routes <list>      Comma-sep blocklist
 */

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
function nowStamp() {
  const d = new Date();
  const pad = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function sanitizeName(value) {
  return (
    String(value || "route")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "route"
  );
}
async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

const BASE_URL = String(getArg("--base-url", "http://localhost:5000")).replace(/\/$/, "");
const ROUTES_FILE_OVERRIDE = getArg("--routes-file", null);
const OUTPUT_DIR = getArg("--out-dir", path.join(cwd, "figma-static", `export-${nowStamp()}`));
const VIEWPORT_WIDTH = Number(getArg("--width", "1512"));
const VIEWPORT_HEIGHT = Number(getArg("--height", "982"));
const THEMES = String(getArg("--themes", "light,dark"))
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter((s) => s === "light" || s === "dark");
const INCLUDE_AUTH = hasFlag("--include-auth");
const SKIP_MOCKS = hasFlag("--skip-mocks");
const STORAGE_STATE = getArg("--storage-state", null);
const PAUSE_MS = Number(getArg("--pause-ms", "1200"));
const WAIT_UNTIL = getArg("--wait-until", "networkidle");
const ROUTES_ALLOW = parseList(getArg("--routes", ""));
const ROUTES_BLOCK = parseList(getArg("--skip-routes", ""));

function parseList(s) {
  return String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

const FIXTURES_DIR = path.join(cwd, "scripts", "figma-export-fixtures");

// ──────────────────────────────────────────────────────────────────────────────
// Route discovery — parse client/src/App.jsx for every <Route path="...">
// ──────────────────────────────────────────────────────────────────────────────

const PROTECTED_WRAPPERS = ["ProtectedRoute", "ProtectedRouteWithOnboarding", "AdminRoute", "ProRoute"];
const PARAM_SAMPLE_VALUES = {
  ":id": "demo",
  ":suffix": "demo",
  ":slug": "demo",
};

/**
 * Walk through `<Route ...` openings and extract attributes + body. JSX nested
 * inside `element={...}` (with its own `>` and `/`) defeats a pure regex, so
 * we do brace-aware scanning instead.
 */
function extractRouteBlocks(source) {
  const blocks = [];
  let i = 0;
  while (i < source.length) {
    const open = source.indexOf("<Route", i);
    if (open === -1) break;
    // Sanity: char after must be space, `>`, or `/` so we don't false-match Routes/RouteFoo.
    const next = source[open + 6];
    if (next && !/[\s>/]/.test(next)) {
      i = open + 6;
      continue;
    }

    // Find the closing `>` of this opening tag, tracking `{ }` depth.
    let j = open + 6;
    let braceDepth = 0;
    let tagClose = -1;
    let selfClosing = false;
    while (j < source.length) {
      const ch = source[j];
      if (ch === "{") braceDepth++;
      else if (ch === "}") braceDepth--;
      else if (ch === ">" && braceDepth === 0) {
        tagClose = j;
        selfClosing = source[j - 1] === "/";
        break;
      }
      j++;
    }
    if (tagClose === -1) break;

    const rawAttrs = source.slice(open + 6, selfClosing ? tagClose - 1 : tagClose).trim();

    let body = "";
    let blockEnd = tagClose + 1;
    if (!selfClosing) {
      // Find matching </Route>, handling nested block-form <Route ...> children.
      // Self-closing children must NOT count toward depth.
      let depth = 1;
      let k = tagClose + 1;
      const closeTok = "</Route>";
      while (k < source.length && depth > 0) {
        if (source.startsWith("<Route", k)) {
          const peek = source[k + 6];
          if (peek && /[\s>/]/.test(peek)) {
            // Probe forward to check if this nested <Route is self-closing.
            let p = k + 6;
            let bd = 0;
            let nestedClose = -1;
            let nestedSelf = false;
            while (p < source.length) {
              const c = source[p];
              if (c === "{") bd++;
              else if (c === "}") bd--;
              else if (c === ">" && bd === 0) {
                nestedClose = p;
                nestedSelf = source[p - 1] === "/";
                break;
              }
              p++;
            }
            if (nestedClose === -1) break;
            if (!nestedSelf) depth++;
            k = nestedClose + 1;
            continue;
          }
          k++;
        } else if (source.startsWith(closeTok, k)) {
          depth--;
          if (depth === 0) {
            body = source.slice(tagClose + 1, k);
            blockEnd = k + closeTok.length;
            break;
          }
          k += closeTok.length;
        } else {
          k++;
        }
      }
    }

    blocks.push({ attrs: rawAttrs, body, selfClosing });
    i = blockEnd;
  }
  return blocks;
}

async function discoverRoutesFromAppJsx() {
  const appPath = path.join(cwd, "client", "src", "App.jsx");
  const source = await fs.readFile(appPath, "utf8");

  const blocks = extractRouteBlocks(source);
  const routes = [];

  function collectAuth(attrs, body) {
    const inspectArea = attrs + " " + body;
    return {
      requiresAuth: PROTECTED_WRAPPERS.some((w) => new RegExp(`<${w}\\b`).test(inspectArea)),
      requiresAdmin: /<AdminRoute\b/.test(inspectArea),
      requiresPro: /<ProRoute\b/.test(inspectArea),
    };
  }

  function walkBlocks(blockList, parentPath, parentAuth) {
    for (const { attrs, body } of blockList) {
      // Skip <Route index ... /> — index routes have no path, they alias the parent.
      const indexMatch = /\bindex\b/.test(attrs) && !/\bpath=/.test(attrs);
      if (indexMatch && parentPath) {
        // Render the parent path itself instead of an index alias.
        continue;
      }

      const pathMatch = attrs.match(/\bpath=["']([^"']+)["']/);
      if (!pathMatch) continue;
      const childPathRaw = pathMatch[1];
      if (childPathRaw === "*") continue;

      const ownAuth = collectAuth(attrs, ""); // own-attrs only for parent-set wrappers
      const myAuth = {
        requiresAuth: ownAuth.requiresAuth || parentAuth.requiresAuth,
        requiresAdmin: ownAuth.requiresAdmin || parentAuth.requiresAdmin,
        requiresPro: ownAuth.requiresPro || parentAuth.requiresPro,
      };

      const fullPath = childPathRaw.startsWith("/")
        ? childPathRaw
        : `${parentPath.replace(/\/$/, "")}/${childPathRaw}`;

      routes.push({
        path: fullPath,
        ...myAuth,
        label: sanitizeName(fullPath === "/" ? "home" : fullPath),
      });

      // Recurse into body for nested children (e.g. /pro layout).
      if (body && body.includes("<Route")) {
        const childBlocks = extractRouteBlocks(body);
        walkBlocks(childBlocks, fullPath, myAuth);
      }
    }
  }

  walkBlocks(blocks, "", { requiresAuth: false, requiresAdmin: false, requiresPro: false });

  // De-dupe by path; substitute placeholders for :params; absolutize child routes.
  const seen = new Set();
  const final = [];
  for (const r of routes) {
    let p = r.path;
    for (const [token, value] of Object.entries(PARAM_SAMPLE_VALUES)) {
      p = p.replaceAll(token, value);
    }
    // Children of <Route path="/pro"> use bare paths like "models" — promote to absolute.
    if (!p.startsWith("/")) p = `/pro/${p}`;
    if (seen.has(p)) continue;
    seen.add(p);
    const label = sanitizeName(p === "/" ? "home" : p);
    final.push({ ...r, path: p, originalPath: r.path, label });
  }

  // Always include the design-system page if it's wired in App.jsx.
  if (!seen.has("/__design__") && source.includes('"/__design__"')) {
    final.push({ path: "/__design__", label: "design-system", requiresAuth: false, requiresAdmin: false, requiresPro: false });
  }

  return final;
}

async function loadRoutes() {
  if (ROUTES_FILE_OVERRIDE) {
    const raw = await fs.readFile(ROUTES_FILE_OVERRIDE, "utf8");
    return JSON.parse(raw);
  }
  return discoverRoutesFromAppJsx();
}

// ──────────────────────────────────────────────────────────────────────────────
// Fixture loading + API mocking
// ──────────────────────────────────────────────────────────────────────────────

async function loadFixtureMap() {
  const indexPath = path.join(FIXTURES_DIR, "_index.js");
  if (!existsSync(indexPath)) {
    console.warn(`[fixtures] _index.js not found at ${indexPath} — falling back to empty map`);
    return [];
  }
  const mod = await import(`file://${indexPath.replace(/\\/g, "/")}`);
  return mod.FIXTURE_MAP || [];
}

const fixtureCache = new Map();
async function readFixture(filename) {
  if (fixtureCache.has(filename)) return fixtureCache.get(filename);
  const filePath = path.join(FIXTURES_DIR, filename);
  if (!existsSync(filePath)) {
    const empty = { ok: true, missing: filename };
    fixtureCache.set(filename, empty);
    return empty;
  }
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  fixtureCache.set(filename, parsed);
  return parsed;
}

async function installApiMocks(context, fixtureMap) {
  if (SKIP_MOCKS) return;
  const seenUnmatched = new Set();
  await context.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const entry = fixtureMap.find((m) => m.pattern.test(pathname));
    if (!entry) {
      if (!seenUnmatched.has(pathname)) {
        seenUnmatched.add(pathname);
        console.warn(`[mock] unmatched ${pathname} (returning empty 200)`);
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return;
    }
    const body = await readFixture(entry.fixture);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

  // Block 3rd-party tracking / analytics that would slow down the export.
  await context.route(
    /(googletagmanager|google-analytics|googleads|facebook\.net|hotjar|segment|amplitude|mixpanel|sentry|stripe\.com\/v3|m\.stripe)/,
    (r) => r.fulfill({ status: 204, body: "" }),
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Theme + auth state injection (no real auth backend needed)
// ──────────────────────────────────────────────────────────────────────────────

const FAKE_AUTH_STATE = {
  state: {
    user: {
      id: "user_demo_001",
      email: "demo@modelclone.app",
      username: "demo",
      role: "admin",
      credits: 12500,
      proAccess: true,
      onboardingCompleted: true,
      specialOfferEligible: false,
    },
    token: "demo.jwt.token",
    isAuthenticated: true,
  },
  version: 0,
};

async function seedClientState(context, theme, includeAuth) {
  await context.addInitScript(
    ({ theme, includeAuth, authState }) => {
      try {
        // Theme — mc-theme key + html class to match useTheme.jsx behavior.
        localStorage.setItem("mc-theme", theme);
        const html = document.documentElement;
        html.classList.remove("light", "dark");
        html.classList.add(theme);
        html.setAttribute("data-theme", theme);
        // The page bg is forced inline in useTheme.jsx; pre-set it so first paint is correct.
        const pageBg = theme === "light" ? "#eef1f7" : "#050505";
        html.style.background = pageBg;
        if (document.body) document.body.style.background = pageBg;

        if (includeAuth) {
          // Zustand persist key for useAuthStore (see client/src/store/index.js).
          localStorage.setItem("auth-storage", JSON.stringify(authState));
        }
      } catch (e) {
        console.warn("[seed] localStorage write failed:", e);
      }
    },
    { theme, includeAuth, authState: FAKE_AUTH_STATE },
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Snapshot
// ──────────────────────────────────────────────────────────────────────────────

async function snapshotPage(page, htmlPath, pngPath) {
  // Wait for fonts and layout to settle.
  try {
    await page.evaluate(() => document.fonts && document.fonts.ready);
  } catch {}
  await page.waitForTimeout(PAUSE_MS);

  const snapshot = await page.evaluate(() => {
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll("script").forEach((el) => el.remove());

    const collectedRules = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        if (!sheet.cssRules) continue;
        for (const rule of Array.from(sheet.cssRules)) {
          collectedRules.push(rule.cssText);
        }
      } catch {
        // ignore cross-origin sheets
      }
    }
    const head = clone.querySelector("head");
    const body = clone.querySelector("body");
    if (head) {
      const styleTag = document.createElement("style");
      styleTag.setAttribute("data-export-inline-css", "true");
      styleTag.textContent = collectedRules.join("\n");
      head.appendChild(styleTag);
      const baseTag = document.createElement("base");
      baseTag.setAttribute("href", `${window.location.origin}/`);
      head.prepend(baseTag);
    }
    if (body) body.setAttribute("data-exported-from", window.location.href);
    return `<!doctype html>\n${clone.outerHTML}`;
  });

  await fs.writeFile(htmlPath, snapshot, "utf8");
  await page.screenshot({ path: pngPath, fullPage: true });
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

async function run() {
  const allRoutes = await loadRoutes();
  const fixtureMap = await loadFixtureMap();

  const allowed = allRoutes.filter((r) => {
    if (ROUTES_ALLOW.length && !ROUTES_ALLOW.includes(r.path)) return false;
    if (ROUTES_BLOCK.length && ROUTES_BLOCK.includes(r.path)) return false;
    if (r.requiresAuth && !INCLUDE_AUTH) return false;
    return true;
  });

  await ensureDir(OUTPUT_DIR);

  console.log(`──────────────────────────────────────────────────────────`);
  console.log(` Figma export`);
  console.log(`   base URL : ${BASE_URL}`);
  console.log(`   routes   : ${allowed.length} (of ${allRoutes.length} discovered)`);
  console.log(`   themes   : ${THEMES.join(", ")}`);
  console.log(`   mocks    : ${SKIP_MOCKS ? "OFF (using real backend)" : "ON (fixtures)"}`);
  console.log(`   include-auth : ${INCLUDE_AUTH}`);
  console.log(`   output   : ${OUTPUT_DIR}`);
  console.log(`──────────────────────────────────────────────────────────\n`);

  const browser = await chromium.launch({ headless: true });
  const exported = [];
  const skipped = [];

  for (const theme of THEMES) {
    const contextOptions = {
      viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
      colorScheme: theme === "dark" ? "dark" : "light",
    };
    if (STORAGE_STATE && SKIP_MOCKS) contextOptions.storageState = STORAGE_STATE;

    const context = await browser.newContext(contextOptions);
    await installApiMocks(context, fixtureMap);
    await seedClientState(context, theme, INCLUDE_AUTH);
    const page = await context.newPage();

    for (const route of allowed) {
      const url = `${BASE_URL}${route.path.startsWith("/") ? "" : "/"}${route.path}`;
      const dir = path.join(OUTPUT_DIR, route.label || sanitizeName(route.path), theme);
      await ensureDir(dir);
      try {
        process.stdout.write(`  ${theme.padEnd(5)} ${route.path}`.padEnd(60));
        await page.goto(url, { waitUntil: WAIT_UNTIL, timeout: 60_000 });
        await snapshotPage(page, path.join(dir, "index.html"), path.join(dir, "preview.png"));
        exported.push({ path: route.path, theme, file: path.relative(OUTPUT_DIR, path.join(dir, "index.html")) });
        console.log("ok");
      } catch (error) {
        skipped.push({ path: route.path, theme, reason: error?.message || "unknown" });
        console.log(`SKIP (${error?.message?.slice(0, 60) || "unknown"})`);
      }
    }

    await context.close();
  }

  await browser.close();

  const manifest = {
    exportedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    themes: THEMES,
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    mocked: !SKIP_MOCKS,
    includeAuth: INCLUDE_AUTH,
    routesDiscovered: allRoutes.length,
    routesExported: allowed.length,
    exported,
    skipped,
  };
  await fs.writeFile(path.join(OUTPUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log(`\nDone. ${exported.length} ok / ${skipped.length} skipped.`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Next: import each <route>/<theme>/index.html into Figma via the html.to.design plugin.`);
}

run().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
