#!/usr/bin/env node
/**
 * Standalone smoke-test of the route discovery used by export-figma-html.mjs.
 * Doesn't need a dev server. Run with: node scripts/figma-export-fixtures/smoke-test-discovery.mjs
 *
 * Should print ~37 routes. If significantly fewer, the discovery regressed.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const PROTECTED_WRAPPERS = ["ProtectedRoute", "ProtectedRouteWithOnboarding", "AdminRoute", "ProRoute"];
const PARAM_SAMPLE_VALUES = { ":id": "demo", ":suffix": "demo", ":slug": "demo" };

function extractRouteBlocks(source) {
  const blocks = [];
  let i = 0;
  while (i < source.length) {
    const open = source.indexOf("<Route", i);
    if (open === -1) break;
    const next = source[open + 6];
    if (next && !/[\s>/]/.test(next)) { i = open + 6; continue; }
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
      let depth = 1;
      let k = tagClose + 1;
      const closeTok = "</Route>";
      while (k < source.length && depth > 0) {
        if (source.startsWith("<Route", k)) {
          const peek = source[k + 6];
          if (peek && /[\s>/]/.test(peek)) {
            let p = k + 6, bd = 0, nc = -1, ns = false;
            while (p < source.length) {
              const c = source[p];
              if (c === "{") bd++;
              else if (c === "}") bd--;
              else if (c === ">" && bd === 0) { nc = p; ns = source[p - 1] === "/"; break; }
              p++;
            }
            if (nc === -1) break;
            if (!ns) depth++;
            k = nc + 1;
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
        } else { k++; }
      }
    }
    blocks.push({ attrs: rawAttrs, body, selfClosing });
    i = blockEnd;
  }
  return blocks;
}

const source = await fs.readFile(path.join(repoRoot, "client", "src", "App.jsx"), "utf8");

const routes = [];
const seen = new Set();
function collectAuth(attrs, body) {
  const area = attrs + " " + body;
  return {
    requiresAuth: PROTECTED_WRAPPERS.some((w) => new RegExp(`<${w}\\b`).test(area)),
    requiresAdmin: /<AdminRoute\b/.test(area),
    requiresPro: /<ProRoute\b/.test(area),
  };
}
function walk(list, parentPath, parentAuth) {
  for (const { attrs, body } of list) {
    if (/\bindex\b/.test(attrs) && !/\bpath=/.test(attrs)) continue;
    const pm = attrs.match(/\bpath=["']([^"']+)["']/);
    if (!pm) continue;
    const raw = pm[1];
    if (raw === "*") continue;
    const own = collectAuth(attrs, "");
    const my = {
      requiresAuth: own.requiresAuth || parentAuth.requiresAuth,
      requiresAdmin: own.requiresAdmin || parentAuth.requiresAdmin,
      requiresPro: own.requiresPro || parentAuth.requiresPro,
    };
    const full = raw.startsWith("/") ? raw : `${parentPath.replace(/\/$/, "")}/${raw}`;
    let p = full;
    for (const [t, v] of Object.entries(PARAM_SAMPLE_VALUES)) p = p.replaceAll(t, v);
    if (!seen.has(p)) {
      seen.add(p);
      routes.push({ path: p, ...my });
    }
    if (body && body.includes("<Route")) {
      walk(extractRouteBlocks(body), full, my);
    }
  }
}
walk(extractRouteBlocks(source), "", { requiresAuth: false, requiresAdmin: false, requiresPro: false });

console.log(`Discovered: ${routes.length} routes`);
console.log(`  Public: ${routes.filter(r => !r.requiresAuth).length}`);
console.log(`  Auth:   ${routes.filter(r => r.requiresAuth).length}`);
console.log(`  Admin:  ${routes.filter(r => r.requiresAdmin).length}`);
console.log(`  Pro:    ${routes.filter(r => r.requiresPro).length}`);
console.log(`---`);
for (const r of routes) {
  const flags = [
    r.requiresAuth ? "A" : " ",
    r.requiresAdmin ? "D" : " ",
    r.requiresPro ? "P" : " ",
  ].join("");
  console.log(`[${flags}]  ${r.path}`);
}
