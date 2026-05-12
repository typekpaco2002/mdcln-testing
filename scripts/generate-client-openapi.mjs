#!/usr/bin/env node
/**
 * Merge `docs/openapi/client-api.base.yaml` with exhaustive route scan +
 * curated operation overrides (`openapi-client-operation-overrides.mjs`),
 * then emit `docs/openapi/client-api.openapi.yaml`.
 *
 * Run: npm run openapi:client
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { getClientOpenApiOverride } from "./openapi-client-operation-overrides.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ROUTES_DIR = path.join(ROOT, "src", "routes");
const SERVER_FILE = path.join(ROOT, "src", "server.js");
const API_ROUTES_FILE = path.join(ROUTES_DIR, "api.routes.js");
const BASE_FILE = path.join(ROOT, "docs", "openapi", "client-api.base.yaml");
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

/**
 * Express `:id` segments → OpenAPI `{id}` paths.
 */
function expressPathToOpenApi(exprPath) {
  return exprPath.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}");
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
  const re = /import\s+(\w+)\s+from\s+["'](\.[^"']+)["']\s*;?/g;
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

function defaultResponseRefs() {
  return {
    "200": { $ref: "#/components/responses/SuccessOk" },
    "400": { $ref: "#/components/responses/ValidationFailed400" },
    "401": { $ref: "#/components/responses/Unauthorized" },
    "402": { $ref: "#/components/responses/PaymentRequired402" },
    "403": { $ref: "#/components/responses/Forbidden403" },
    "409": { $ref: "#/components/responses/Conflict409" },
    "413": { $ref: "#/components/responses/PayloadTooLarge413" },
    "429": { $ref: "#/components/responses/RateLimited429" },
    "500": { $ref: "#/components/responses/Internal500" },
    "503": { $ref: "#/components/responses/ServiceUnavailable503" },
  };
}

/** @typedef {{ operationId: string, summary: string, description: string, tags: string[], responses: Record<string, unknown>, security?: unknown[], requestBody?: unknown }} GeneratedOp */

function semanticApiPath(openapiPath) {
  return openapiPath.startsWith("/api/v1/")
    ? `/api/${openapiPath.slice("/api/v1/".length)}`
    : openapiPath;
}

/** Public SPA auth routes — do not annotate with session/API-key schemes. */
function isPublicLoginOrSignupPost(verb, openapiPath) {
  const sem = semanticApiPath(openapiPath);
  return (
    verb === "POST" && (sem === "/api/auth/login" || sem === "/api/auth/signup")
  );
}

/**
 * Default operation before overrides.
 * @param {string} verb HTTP verb uppercase
 * @param {string} openapiPath OpenAPI path `{param}`
 */
function buildDefaultOperation(verb, openapiPath, sourceFile, tag) {
  const mutating =
    verb === "POST" || verb === "PUT" || verb === "PATCH" || verb === "DELETE";
  const rawOpId =
    `${verb}_${openapiPath.replace(/\{([^}]+)\}/g, ":$1")}`.toLowerCase();

  /** @type {GeneratedOp} */
  const base = {
    operationId: rawOpId.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 120) || "op",
    summary: `${verb} ${openapiPath}`,
    description:
      `Auto-discovered from \`${sourceFile}\`. Coverage follows literal Express path strings — alternate mounts may be missing. Run \`npm run openapi:client\` after route edits and \`npm run docs:registry\` for \`HTTP_ROUTES.md\`.`,
    tags: [tag],
    responses: defaultResponseRefs(),
  };

  const sem = semanticApiPath(openapiPath);

  if (openapiPath === "/health") {
    // no schemes
  } else if (
    openapiPath.startsWith("/api/admin/") ||
    openapiPath.startsWith("/api/admin") ||
    sem.startsWith("/api/admin/")
  ) {
    base.security = [{ SessionCookieAuth: [] }];
    base.description +=
      "\n\n**Integrators:** Admin JSON rejects **`mcl_`**‑only callers with **`ADMIN_SESSION_ONLY`** — use browser admin session JWT.";
  } else if (
    openapiPath.startsWith("/api/") &&
    !isPublicLoginOrSignupPost(verb, openapiPath)
  ) {
    base.security = [{ SessionCookieAuth: [] }, { ApiKeyAuth: [] }, { BearerAuth: [] }];
  }

  if (verb === "GET" || !mutating) {
    delete base.requestBody;
  }

  return base;
}

/**
 * Merge scanner op with handwritten override fragments.
 */
function mergeOperation(base, overlay) {
  if (!overlay) return base;

  /** @type {GeneratedOp & Record<string, unknown>} */
  const out = /** @type {any} */ ({ ...base });
  const { responses: overlayResponses, tags: overlayTags, ...restOverlay } = overlay;

  Object.assign(out, restOverlay);

  if (overlayTags !== undefined) {
    const merged = [...new Set([...(base.tags || []), ...overlayTags])];
    merged.sort((a, b) => a.localeCompare(b));
    out.tags = merged;
  }

  if (overlayResponses !== undefined) {
    out.responses = {
      ...(base.responses ?? {}),
      ...overlayResponses,
    };
  }

  return out;
}

function stripUndefinedDeep(node) {
  if (node === undefined) return node;
  if (Array.isArray(node)) {
    return node.map(stripUndefinedDeep).filter((x) => x !== undefined);
  }
  if (node !== null && typeof node === "object") {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (v === undefined) continue;
      const nv = stripUndefinedDeep(v);
      out[k] = nv;
    }
    return out;
  }
  return node;
}

function main() {
  if (!fs.existsSync(BASE_FILE)) {
    console.error("[openapi:client] Missing base YAML:", BASE_FILE);
    process.exitCode = 1;
    return;
  }

  const baseText = fs.readFileSync(BASE_FILE, "utf8");
  /** @type {Record<string, any>} */
  const doc = YAML.parse(baseText) || {};
  if (!doc.openapi) {
    console.error("[openapi:client] Base YAML missing `openapi:`");
    process.exitCode = 1;
    return;
  }

  doc.paths = {};
  doc.info ||= {};
  doc.info["x-openapi-client-generated-at"] = new Date().toISOString();

  const prefixByFile = buildPrefixMap();

  const routeFiles = [SERVER_FILE, ...walkRouteFiles(ROUTES_DIR)];
  const allRows = [];
  for (const f of routeFiles) {
    const rel =
      f === SERVER_FILE ? "src/server.js" : `src/routes/${routeRelKey(f)}`;
    const key = f === SERVER_FILE ? null : routeRelKey(f);
    if (
      key &&
      (BLACKLIST_BASENAMES.has(path.basename(f)) || BLACKLIST_ROUTE_RELS.has(key))
    )
      continue;
    const content = fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
    extractExpressPaths(content, rel).forEach((row) =>
      allRows.push({ ...row, routeKey: key }),
    );
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

    for (const basePrefix of prefixes) {
      const fullPath =
        joinUrlPrefix(basePrefix || "", p === "/" && basePrefix ? "" : p).replace(
          /\/+/g,
          "/",
        ) || "/";
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
    const pa = expressPathToOpenApi(a[0].slice(ia + 1));
    const mb = b[0].slice(0, ib);
    const pb = expressPathToOpenApi(b[0].slice(ib + 1));
    if (pa !== pb) return pa.localeCompare(pb);
    const order = { get: 0, post: 1, put: 2, patch: 3, delete: 4 };
    return (order[ma.toLowerCase()] ?? 99) - (order[mb.toLowerCase()] ?? 99);
  });

  /** @type {Map<string, Record<string, GeneratedOp>>} */
  const pathObjects = new Map();

  for (const [key, meta] of sortedOps) {
    const sp = key.indexOf(" ");
    const verb = key.slice(0, sp);
    const absoluteExpressPath = key.slice(sp + 1);
    const openapiPath = expressPathToOpenApi(absoluteExpressPath);

    let pathKey = openapiPath;
    if (!pathKey.startsWith("/")) pathKey = `/${pathKey}`;

    if (!pathObjects.has(pathKey)) pathObjects.set(pathKey, {});
    const method = meta.method;
    const tagsArr = [...meta.tags].sort();
    let op = buildDefaultOperation(verb, pathKey, meta.source, tagsArr[0] || "API");
    op.tags = tagsArr.length ? tagsArr : ["API"];

    const ov = getClientOpenApiOverride(pathKey, method);
    op = mergeOperation(op, ov);
    pathObjects.get(pathKey)[method] = op;
  }

  const sortedPaths = [...pathObjects.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  for (const [pathKey, methods] of sortedPaths) {
    const sortedMethods = Object.keys(methods).sort((a, b) => {
      const ord = { get: 0, post: 1, put: 2, patch: 3, delete: 4 };
      return (ord[a] ?? 99) - (ord[b] ?? 99);
    });
    doc.paths[pathKey] = {};
    for (const m of sortedMethods) {
      doc.paths[pathKey][m] = stripUndefinedDeep(methods[m]);
    }
  }

  const yamlBody = YAML.stringify(doc, {
    indent: 2,
    lineWidth: 0,
    simpleKeys: false,
  });

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(
    OUT_FILE,
    `# GENERATED FILE — edit docs/openapi/client-api.base.yaml or scripts/, then npm run openapi:client\n\n${yamlBody}`,
    "utf8",
  );
  console.log(
    `[openapi:client] Wrote ${path.relative(
      ROOT,
      OUT_FILE,
    )} (${operations.size} operations, ${sortedPaths.length} paths)`,
  );

  /** Warn orphan route files without prefixes */
  const allKeys = new Set(walkRouteFiles(ROUTES_DIR).map((p) => routeRelKey(p)));
  for (const k of allKeys) {
    if (BLACKLIST_BASENAMES.has(path.basename(k)) || BLACKLIST_ROUTE_RELS.has(k))
      continue;
    if (k.startsWith("telegram/legacy/")) continue;
    if (!prefixByFile.has(k)) {
      console.warn(
        `[openapi:client] No mount resolved for routes file: ${k} (might be reachable only indirectly — check manually)`,
      );
    }
  }
}

main();
