#!/usr/bin/env node
/**
 * Build a single exhaustive OpenAPI 3.0 spec for SPA + integrator–usable HTTP APIs.
 *
 * Uses the same literal route scan as docs:registry (`router.get('/path')`…),
 * resolves Express mount prefixes from `server.js` + `api.routes.js`, and writes:
 *   docs/openapi/client-api.openapi.yaml
 *
 * Run: npm run openapi:client
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ROUTES_DIR = path.join(ROOT, "src", "routes");
const SERVER_FILE = path.join(ROOT, "src", "server.js");
const API_ROUTES_FILE = path.join(ROUTES_DIR, "api.routes.js");
const OUT_FILE = path.join(ROOT, "docs", "openapi", "client-api.openapi.yaml");

/** Route files that are provider / infra webhooks only — not app or integrator clients. */
const BLACKLIST_BASENAMES = new Set([
  "kie-callback.routes.js",
  "piapi-callback.routes.js",
  "wavespeed-callback.routes.js",
  "runninghub-callback.routes.js",
  "fal-callback.routes.js",
  "runpod-callback.routes.js",
  "heygen-callback.routes.js",
  "stripe.webhook.js",
  "crypto.webhook.js",
]);
/** Relative keys under src/routes/ (slashes) excluded from SPA/integrator docs. */
const BLACKLIST_ROUTE_RELS = new Set(["telegram/webhook.js"]);

function walkRouteFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walkRouteFiles(full, acc);
    else if (name.isFile() && name.name.endsWith(".js")) acc.push(full);
  }
  return acc;
}

function routeRelKey(absPath) {
  return path.relative(ROUTES_DIR, absPath).replace(/\\/g, "/");
}

function extractExpressPaths(content, fileRel) {
  const rows = [];
  const scan = (text) => {
    const re =
      /\b(?:router|app)\.(get|post|put|patch|delete|use)\s*\(\s*["']([/][^'"\\]*)["']/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      rows.push({
        verb: String(m[1]).toUpperCase(),
        path: m[2],
        file: fileRel,
      });
    }
  };
  scan(content);
  scan(content.replace(/[\r\n]+/g, " "));
  return rows;
}

function parseDefaultImports(src, baseDir) {
  /** @type {Map<string, string>} symbol -> relative path from ROUTES_DIR */
  const map = new Map();
  const re =
    /import\s+(\w+)\s+from\s+["'](\.[^"']+)["']\s*;?/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const sym = m[1];
    const spec = m[2];
    const resolved = path.normalize(path.join(baseDir, spec));
    const fromRoutes = path.relative(ROUTES_DIR, resolved).replace(/\\/g, "/");
    map.set(sym, fromRoutes);
  }
  return map;
}

function joinUrlPrefix(base, segment) {
  if (!segment || segment === "/") {
    return base || "/";
  }
  if (!base) return segment.startsWith("/") ? segment : `/${segment}`;
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const s = segment.startsWith("/") ? segment : `/${segment}`;
  return `${b}${s}`.replace(/\/+/g, "/");
}

function parseServerAppUses() {
  const text = fs.readFileSync(SERVER_FILE, "utf8");
  const imports = parseDefaultImports(text, path.join(ROOT, "src"));
  const prefixByRouteFile = new Map(); // relKey -> Set<string>

  const re = /app\.use\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const mount = m[1];
    const sym = m[2];
    if (!mount.startsWith("/api")) continue;
    const rel = imports.get(sym);
    if (!rel) continue;
    if (!prefixByRouteFile.has(rel)) prefixByRouteFile.set(rel, new Set());
    prefixByRouteFile.get(rel).add(mount);
  }
  return prefixByRouteFile;
}

function parseApiRoutesNestedUses() {
  const text = fs.readFileSync(API_ROUTES_FILE, "utf8");
  const imports = parseDefaultImports(text, ROUTES_DIR);
  const nested = []; // { relKey, segment }
  const re = /router\.use\(\s*["']([^"']+)["']\s*,\s*([^)]+)\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const inner = m[2];
    if (inner.includes("err") && inner.includes("req") && inner.includes("res")) continue;
    const parts = inner.split(",").map((s) => s.trim());
    const ident = parts[parts.length - 1];
    if (!/^[A-Za-z_$][\w$]*$/.test(ident)) continue;
    const rel = imports.get(ident);
    if (!rel) continue;
    nested.push({ relKey: rel, segment: m[1] });
  }
  return nested;
}

function buildPrefixMap() {
  const prefixByFile = new Map();

  const mainBases = new Set(["/api", "/api/v1"]);
  prefixByFile.set("api.routes.js", new Set(mainBases));

  const serverMounts = parseServerAppUses();
  for (const [rel, mounts] of serverMounts) {
    if (rel === "routes/api.routes.js") continue;
    if (!prefixByFile.has(rel)) prefixByFile.set(rel, new Set());
    for (const mo of mounts) prefixByFile.get(rel).add(mo);
  }

  const nested = parseApiRoutesNestedUses();
  for (const { relKey, segment } of nested) {
    const parentPrefixes = prefixByFile.get("api.routes.js") || mainBases;
    if (!prefixByFile.has(relKey)) prefixByFile.set(relKey, new Set());
    for (const p of parentPrefixes) {
      prefixByFile.get(relKey).add(joinUrlPrefix(p, segment));
    }
  }

  return prefixByFile;
}

function shouldExcludeFullPath(method, fullPath) {
  if (method === "USE") return true;
  const p = fullPath.toLowerCase();
  if (fullPath.includes("*")) return true;
  if (fullPath.startsWith("/.well-known")) return true;
  if (!fullPath.startsWith("/api") && fullPath !== "/health") return true;
  if (p.startsWith("/api/cron/")) return true;
  if (p.includes("/n8n-callback")) return true;
  if (p.includes("/worker-progress")) return true;
  if (p.startsWith("/api/test-replicate/")) return true;
  return false;
}

function tagForPath(fullPath) {
  const parts = fullPath.replace(/^\/api\/v1\//, "/api/").split("/").filter(Boolean);
  if (parts[0] === "api") parts.shift();
  const first = parts[0] || "root";
  if (first === "admin" || fullPath.includes("/admin/")) return "Admin";
  if (first === "stripe" || first === "crypto") return "Billing";
  if (first === "auth") return "Auth";
  if (first === "generate" || first === "nsfw" || first === "models") return "AI & media";
  if (first === "flows") return "Flows Studio";
  if (first === "img2img" || first === "gptx") return "Tools";
  if (first === "support" || first === "referrals") return "Account";
  return "API";
}

function operationId(method, fullPath) {
  const raw = `${method}_${fullPath}`.toLowerCase();
  return raw.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 120) || "op";
}

function yamlEscape(str) {
  if (/[:#@[\]{}&*!|>'"%]/.test(str) || str.includes("\n")) {
    return JSON.stringify(str);
  }
  return str;
}

function main() {
  const prefixByFile = buildPrefixMap();

  const routeFiles = [SERVER_FILE, ...walkRouteFiles(ROUTES_DIR)];
  const allRows = [];
  for (const f of routeFiles) {
    const rel = f === SERVER_FILE ? "src/server.js" : `src/routes/${routeRelKey(f)}`;
    const key = f === SERVER_FILE ? null : routeRelKey(f);
    if (
      key &&
      (BLACKLIST_BASENAMES.has(path.basename(f)) || BLACKLIST_ROUTE_RELS.has(key))
    )
      continue;
    const content = fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
    extractExpressPaths(content, rel).forEach((row) => allRows.push({ ...row, routeKey: key }));
  }

  const seen = new Set();
  const deduped = [];
  for (const row of allRows) {
    const k = `${row.verb}\t${row.path}\t${row.file}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(row);
  }

  /** @type {Map<string, { method: string, tags: Set<string>, source: string }>} */
  const operations = new Map();

  for (const row of deduped) {
    const { verb, path: p, file, routeKey } = row;
    if (!p.startsWith("/")) continue;

    let prefixes;
    if (file === "src/server.js") {
      prefixes = [""];
    } else if (routeKey && prefixByFile.has(routeKey)) {
      prefixes = [...prefixByFile.get(routeKey)];
    } else {
      continue;
    }

    for (const base of prefixes) {
      const fullPath = joinUrlPrefix(base || "", p === "/" && base ? "" : p).replace(/\/+/g, "/") || "/";
      if (shouldExcludeFullPath(verb, fullPath)) continue;

      const opKey = `${verb} ${fullPath}`;
      const tag = tagForPath(fullPath);
      if (!operations.has(opKey)) {
        operations.set(opKey, {
          method: verb.toLowerCase(),
          tags: new Set([tag]),
          source: file,
        });
      } else {
        operations.get(opKey).tags.add(tag);
      }
    }
  }

  const sortedOps = [...operations.entries()].sort((a, b) => {
    const ia = a[0].indexOf(" ");
    const ib = b[0].indexOf(" ");
    const ma = a[0].slice(0, ia);
    const pa = a[0].slice(ia + 1);
    const mb = b[0].slice(0, ib);
    const pb = b[0].slice(ib + 1);
    if (pa !== pb) return pa.localeCompare(pb);
    const order = { get: 0, post: 1, put: 2, patch: 3, delete: 4 };
    return (order[ma.toLowerCase()] ?? 99) - (order[mb.toLowerCase()] ?? 99);
  });

  const generatedAt = new Date().toISOString();
  const pathBlocks = [];

  /** @type Map<string, object> */
  const pathObjects = new Map();

  for (const [key, meta] of sortedOps) {
    const sp = key.indexOf(" ");
    const verb = key.slice(0, sp);
    const openapiPath = key.slice(sp + 1);
    const method = verb.toLowerCase();
    const oid = operationId(verb, openapiPath);

    let pathKey = openapiPath;
    if (!pathKey.startsWith("/")) pathKey = `/${pathKey}`;

    if (!pathObjects.has(pathKey)) pathObjects.set(pathKey, {});

    const tagsArr = [...meta.tags].sort();
    pathObjects.get(pathKey)[method] = {
      operationId: oid,
      summary: `${verb} ${pathKey}`,
      description:
        `Auto-discovered from \`${meta.source}\`. Literal path scan — dynamic routes may be missing; see \`docs/generated/HTTP_ROUTES.md\` after \`npm run docs:registry\`.`,
      tags: tagsArr,
      responses: {
        "200": { description: "Success (shape varies by endpoint)" },
        "400": { description: "Bad request" },
        "401": { description: "Unauthorized (session or API key required for most routes)" },
        "429": { description: "Rate limited" },
        "500": { description: "Server error" },
      },
    };
  }

  for (const [pathKey, methods] of [...pathObjects.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const lines = [`  ${yamlEscape(pathKey)}:`];
    for (const method of Object.keys(methods).sort()) {
      const op = methods[method];
      lines.push(`    ${method}:`);
      lines.push(`      operationId: ${op.operationId}`);
      lines.push(`      summary: ${yamlEscape(op.summary)}`);
      lines.push(`      description: ${yamlEscape(op.description)}`);
      lines.push(`      tags:`);
      for (const t of op.tags) lines.push(`        - ${yamlEscape(t)}`);
      lines.push(`      responses:`);
      for (const [code, spec] of Object.entries(op.responses)) {
        lines.push(`        "${code}":`);
        lines.push(`          description: ${yamlEscape(spec.description)}`);
      }
    }
    pathBlocks.push(lines.join("\n"));
  }

  const yaml = [
    "openapi: 3.0.3",
    "info:",
    "  title: ModelClone Client & integration API",
    '  version: "1.0.0"',
    `  description: |`,
    "    Generated OpenAPI surface for the ModelClone web app and HTTP integrations.",
    "    **Production base URL:** https://modelclone.app",
    "    **Auth:** Most routes require a browser session cookie from login, or `X-Api-Key` / `Authorization: Bearer` with an `mcl_` API key (paid plans). Admin routes require an admin session (not API-key only).",
    "    **v1 mirror:** The same REST handlers are also mounted under `/api/v1/...` (except Flow Studio — use `/api/flows/...` only).",
    `    **Generated at:** ${generatedAt}`,
    "    **Coverage:** Literal Express path strings only; template-literal routes and some dynamic mounts may be absent. Regenerate with `npm run openapi:client` after route changes.",
    "",
    "servers:",
    "  - url: https://modelclone.app",
    "    description: Production",
    "",
    "tags:",
    "  - name: API",
    "    description: General HTTP API",
    "  - name: Auth",
    "    description: Signup, login, tokens, password, Telegram link",
    "  - name: Billing",
    "    description: Stripe, crypto checkout, subscriptions",
    "  - name: AI & media",
    "    description: Models, generations, NSFW, LoRA",
    "  - name: Flows Studio",
    "    description: Flow automation (mounted under /api/flows only)",
    "  - name: Tools",
    "    description: img2img, GPT-X, repurposer satellites",
    "  - name: Account",
    "    description: Support chat, referrals, profile-adjacent",
    "  - name: Admin",
    "    description: Staff-only administration",
    "",
    "components:",
    "  securitySchemes:",
    "    ApiKeyAuth:",
    "      type: apiKey",
    "      in: header",
    "      name: X-Api-Key",
    "      description: Self-serve API keys (prefix `mcl_`; eligible paid plans)",
    "    BearerAuth:",
    "      type: http",
    "      scheme: bearer",
    "      bearerFormat: mcl_<secret>",
    "      description: Same token as ApiKeyAuth; use Authorization header instead of X-Api-Key.",
    "",
    "paths:",
    ...pathBlocks,
    "",
  ].join("\n");

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, yaml, "utf8");
  console.log(
    `[openapi:client] Wrote ${path.relative(ROOT, OUT_FILE)} (${operations.size} operations, ${pathObjects.size} paths)`
  );

  /** Warn orphan route files without prefixes */
  const allKeys = new Set(walkRouteFiles(ROUTES_DIR).map((p) => routeRelKey(p)));
  for (const k of allKeys) {
    if (BLACKLIST_BASENAMES.has(path.basename(k)) || BLACKLIST_ROUTE_RELS.has(k))
      continue;
    if (k.startsWith("telegram/legacy/")) continue;
    if (!prefixByFile.has(k)) {
      console.warn(`[openapi:client] No mount resolved for routes file: ${k} (might be reachable only indirectly — check manually)`);
    }
  }
}

main();
