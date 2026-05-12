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

/** Public-ish routes inherited from SPA — override global **`security`** with `security: []`. */
const PUBLIC_METHOD_PATHS = new Set(
  [
    ["GET", "/health"],
    ["POST", "/api/auth/login"],
    ["POST", "/api/auth/signup"],
    ["POST", "/api/auth/google"],
    ["POST", "/api/auth/firebase-signup"],
    ["POST", "/api/auth/verify-firebase-email"],
    ["POST", "/api/auth/resend-firebase-code"],
    ["POST", "/api/auth/check-email"],
    ["POST", "/api/auth/refresh"],
  ].map(([m, p]) => `${String(m).toUpperCase()}\t${p}`),
);

const RESPONSE = /** @type {Record<string, { $ref: string }>} */ ({
  SuccessOk: { $ref: "#/components/responses/SuccessOk" },
  HealthOk200: { $ref: "#/components/responses/HealthOk200" },
  Unauthorized: { $ref: "#/components/responses/Unauthorized" },
  ValidationFailed400: { $ref: "#/components/responses/ValidationFailed400" },
  PaymentRequired402: { $ref: "#/components/responses/PaymentRequired402" },
  Forbidden403: { $ref: "#/components/responses/Forbidden403" },
  NotFound404: { $ref: "#/components/responses/NotFound404" },
  Conflict409: { $ref: "#/components/responses/Conflict409" },
  PayloadTooLarge413: { $ref: "#/components/responses/PayloadTooLarge413" },
  RateLimited429: { $ref: "#/components/responses/RateLimited429" },
  Internal500: { $ref: "#/components/responses/Internal500" },
  ServiceUnavailable503: { $ref: "#/components/responses/ServiceUnavailable503" },
});

const OVERRIDES_MD_DIR = path.join(ROOT, "docs", "openapi", "overrides");

/**
 * Tier-1 `200` typings — keys **`VERB /api/...`** with **`{param}`** (OpenAPI template;
 * `/api/v1/...` rows normalize to `/api/...` here).
 */
const ROUTE_RESPONSE_SCHEMAS = {
  "GET /api/me": { ref: "UserAccount" },
  "GET /api/auth/profile": { ref: "UserAccount" },
  "GET /api/models": { paginated: "SavedModelSummary" },
  "GET /api/models/{id}": { ref: "SavedModelSummary" },
  "GET /api/generations": { paginated: "GenerationRecord" },
  "GET /api/generations/{id}": { ref: "GenerationRecord" },
  "GET /api/voices": { paginated: "AnyJsonPayload" },
  "GET /api/voices/{voiceId}/preview": { ref: "AnyJsonPayload" },
  "GET /api/user/api-keys": { paginated: "ApiIntegrationKeyStub" },
  "POST /api/user/api-keys": { ref: "ApiIntegrationKeyStub" },
  "GET /api/generate/creator-studio/assets": { paginated: "AnyJsonPayload" },
  "GET /api/generate/creator-studio/scenes": { ref: "AnyJsonPayload" },
  "GET /api/pricing/generation": { ref: "AnyJsonPayload" },
  "GET /api/stripe/subscription-status": { ref: "SubscriptionState" },
  "GET /api/upscale/status/{generationId}": { ref: "GenerationRecord" },
  "POST /api/generate/advanced": { ref: "GenerationRecord" },
  "POST /api/nsfw/generate": { ref: "GenerationRecord" },
  "POST /api/img2img/generate": { ref: "GenerationRecord" },
  "POST /api/upscale": { ref: "GenerationRecord" },
  "GET /api/flows": { paginated: "FlowDocument" },
  "GET /api/flows/{id}": { ref: "FlowDocument" },
  "GET /api/flows/runs/{runId}": { ref: "FlowRunStatus" },
  "POST /api/flows": { ref: "FlowDocument" },
  "POST /api/flows/{id}/run": { ref: "FlowRunStatus" },
  "GET /api/models/{modelId}/voices": { ref: "VoiceCloneJob" },
  "POST /api/upload": { ref: "AnyJsonPayload" },
  "POST /api/upload/blob": { ref: "AnyJsonPayload" },
  "POST /api/stripe/create-checkout-session": { ref: "AnyJsonPayload" },
  "POST /api/stripe/create-onetime-checkout": { ref: "AnyJsonPayload" },
  "GET /api/img2img/status/{jobId}": { ref: "GenerationRecord" },
  "GET /api/support/tickets": { paginated: "AnyJsonPayload" },
  "GET /api/referrals/summary": { ref: "AnyJsonPayload" },
  "POST /api/img2img/describe": { ref: "GenerationRecord" },
  "POST /api/gptx/send": { ref: "AnyJsonPayload" },
  "GET /api/gptx/conversations": { paginated: "AnyJsonPayload" },
  "GET /api/flows/node-types": { ref: "AnyJsonPayload" },
  "POST /api/flows/estimate-credits": { ref: "AnyJsonPayload" },
};

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function loadMarkdownOverrideMap() {
  /** @type {Record<string, string>} */
  const map = {};
  if (!fs.existsSync(OVERRIDES_MD_DIR)) return map;
  for (const fname of fs.readdirSync(OVERRIDES_MD_DIR)) {
    if (!fname.endsWith(".md")) continue;
    map[path.basename(fname, ".md")] = fs
      .readFileSync(path.join(OVERRIDES_MD_DIR, fname), "utf8")
      .trim();
  }
  return map;
}

function routeFileContent(sourceRel) {
  const abs =
    sourceRel === "src/server.js"
      ? SERVER_FILE
      : path.join(ROOT, "src", "routes", sourceRel.replace(/^src\/routes\//, ""));
  try {
    return fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
  } catch {
    return "";
  }
}

function jsdocSentenceAboveRoute(content, verbLc, routePath) {
  const esc = escapeRe(routePath);
  const re = new RegExp(
    `(\\/\\*[\\s\\S]*?\\*\\/\\s*)(?:router|app)\\.${verbLc}\\(\\s*['"]${esc}['"]`,
    "m",
  );
  const m = content.match(re);
  if (!m) return "";
  const block = m[1].replace(/^\s*\/\*\*?/, "").replace(/\*\/\s*$/, "");
  const lines = block
    .split("\n")
    .map((line) => line.replace(/^\s*\* ?/, "").trim())
    .filter(Boolean);
  const inner = lines.join(" ").replace(/\s+/g, " ");
  const cut = inner.match(/^(.{1,400}?[.!?])(\s|$)/);
  return (cut ? cut[1] : inner.slice(0, 220)).trim();
}

function routeMiddlewareSnippet(content, verbLc, routePath, max = 8000) {
  const esc = escapeRe(routePath);
  const re = new RegExp(`(?:router|app)\\.${verbLc}\\(\\s*['\"]${esc}['\"]`);
  const m = re.exec(content);
  if (!m) return "";
  return content.slice(m.index + m[0].length, m.index + m[0].length + max);
}

function findClosingParen(src, openParenIdx) {
  if (!src || openParenIdx < 0 || src[openParenIdx] !== "(") return -1;
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTpl = false;
  for (let i = openParenIdx; i < src.length; i++) {
    const c = src[i];
    const prev = src[i - 1];
    if (!inDouble && !inTpl && c === "'" && prev !== "\\") inSingle = !inSingle;
    else if (!inSingle && !inTpl && c === '"' && prev !== "\\") inDouble = !inDouble;
    else if (!inSingle && !inDouble && c === "`" && prev !== "\\") inTpl = !inTpl;
    if (inSingle || inDouble || inTpl) continue;
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function takeValidatorChain(src, fromIdx) {
  let i = fromIdx;
  let out = "";
  while (i < src.length) {
    const sub = src.slice(i);
    const dot = sub.match(/^\s*\.([a-zA-Z_][a-zA-Z0-9_]*)\s*/);
    if (!dot) break;
    out += dot[0];
    i += dot[0].length;
    if (src[i] === "(") {
      const close = findClosingParen(src, i);
      if (close === -1) break;
      out += src.slice(i, close + 1);
      i = close + 1;
    }
  }
  return out;
}

function extractWithMessageDescription(chain) {
  const hit = chain.match(/\.withMessage\s*\(\s*(['"`])([\s\S]*?)\1\s*\)/);
  if (!hit) return "";
  return String(hit[2]).replace(/\s+/g, " ").trim().slice(0, 400);
}

function applyChainMethod(name, args, sch) {
  switch (name) {
    case "isEmail":
      sch.type = "string";
      sch.format = "email";
      break;
    case "isISO8601":
    case "isISO86001":
    case "isDate":
      sch.type = "string";
      sch.format = "date-time";
      break;
    case "isString":
      sch.type = "string";
      break;
    case "isUUID":
      sch.type = "string";
      sch.format = "uuid";
      break;
    case "isURL":
    case "isUri":
      sch.type = "string";
      sch.format = "uri";
      break;
    case "isBoolean":
      sch.type = "boolean";
      break;
    case "isInt":
      sch.type = "integer";
      applyNumBounds(args, sch);
      break;
    case "isFloat":
    case "isNumeric":
    case "isDecimal":
      sch.type = "number";
      applyNumBounds(args, sch);
      break;
    case "isIn": {
      const parts = args.match(/['"]([^'"]+)['"]/g) || [];
      sch.type = "string";
      sch.enum = parts.map((p) => p.replace(/^['"]|['"]$/g, ""));
      break;
    }
    case "matches": {
      const lit = args.match(/\/([^/]+)\/([gimsuy]*)/);
      if (lit) sch.pattern = lit[1];
      break;
    }
    case "isLength": {
      const mn = args.match(/min(?:imum)?\s*:\s*(\d+)/);
      const mx = args.match(/max(?:imum)?\s*:\s*(\d+)/);
      if (mn) sch.minLength = Number(mn[1]);
      if (mx) sch.maxLength = Number(mx[1]);
      break;
    }
    case "isArray": {
      sch.type = "array";
      sch.items = { type: "string" };
      const minA = args.match(/min\s*:\s*(\d+)/);
      const maxA = args.match(/max\s*:\s*(\d+)/);
      if (minA) sch.minItems = Number(minA[1]);
      if (maxA) sch.maxItems = Number(maxA[1]);
      break;
    }
    case "isObject":
      sch.type = "object";
      sch.additionalProperties = true;
      break;
    default:
      break;
  }
}

function parseValidatorChain(chain) {
  let required = true;
  /** @type {Record<string, unknown>} */
  const sch = {};
  let i = 0;
  while (i < chain.length) {
    const sub = chain.slice(i);
    const dot = sub.match(/^\s*\.([a-zA-Z][a-zA-Z0-9_]*)/);
    if (!dot) break;
    const name = dot[1];
    i += dot[0].length;
    let args = "";
    if (chain[i] === "(") {
      const close = findClosingParen(chain, i);
      if (close !== -1) {
        args = chain.slice(i + 1, close);
        i = close + 1;
      } else i++;
    }
    if (name === "optional") {
      required = false;
    } else if (
      name === "trim" ||
      name === "notEmpty" ||
      name === "exists" ||
      name === "escape" ||
      name === "toInt" ||
      name === "toFloat" ||
      name === "bail"
    ) {
      /* skip */
    } else {
      applyChainMethod(name, args, sch);
    }
  }
  const msg = extractWithMessageDescription(chain);
  if (msg) sch.description = msg;
  if (!sch.type) sch.type = "string";
  return { schema: sch, required };
}

function applyNumBounds(args, sch) {
  const mn = args.match(/min(?:imum)?\s*:\s*(-?\d+)/);
  const mx = args.match(/max(?:imum)?\s*:\s*(-?\d+)/);
  if (mn) sch.minimum = Number(mn[1]);
  if (mx) sch.maximum = Number(mx[1]);
}

function pruneEmptyRequired(node) {
  if (!node || typeof node !== "object") return;
  if (node.required && Array.isArray(node.required) && node.required.length === 0) {
    delete node.required;
  }
  const props = node.properties;
  if (props && typeof props === "object") {
    for (const ch of Object.values(props)) pruneEmptyRequired(ch);
  }
}

function mergeDottedTree(flat) {
  const root = { type: "object", properties: {}, required: [] };
  for (const [dot, { schema, required }] of Object.entries(flat)) {
    const segs = dot.split(".").filter(Boolean);
    /** @type {any} */
    let node = root;
    for (let j = 0; j < segs.length; j++) {
      const sg = segs[j];
      const last = j === segs.length - 1;
      node.properties ||= {};
      node.required ||= [];
      if (last) {
        node.properties[sg] = { ...schema };
        if (required && !node.required.includes(sg)) node.required.push(sg);
      } else {
        if (!node.properties[sg]) {
          node.properties[sg] = { type: "object", properties: {}, required: [] };
        }
        node = node.properties[sg];
      }
    }
  }
  pruneEmptyRequired(root);
  if (!root.required?.length) delete root.required;
  return root;
}

function mineKindFromSnippet(snippet, kind) {
  const re =
    kind === "body"
      ? /\bbody\s*\(\s*['"]([^'"]+)['"]\s*\)/g
      : /\bquery\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  /** @type {Record<string, { schema: Record<string, unknown>; required: boolean }>} */
  const flat = {};
  let m;
  while ((m = re.exec(snippet)) !== null) {
    const field = m[1];
    const chainStart = m.index + m[0].length;
    const chain = takeValidatorChain(snippet, chainStart);
    flat[field] = parseValidatorChain(chain);
  }
  return flat;
}

function mineHeuristicQueryParams(snippet) {
  /** @type {any[]} */
  const out = [];
  const names = ["page", "limit", "cursor", "offset", "status", "sort", "order"];
  for (const name of names) {
    const rx = new RegExp(`req\\.query\\.${name}\\b|req\\.query\\[\\s*['\"]${name}['\"]\\s*\\]`);
    if (!rx.test(snippet)) continue;
    if (name === "limit") {
      out.push({
        name,
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 1, maximum: 500, default: 20 },
        description: "Pagination size (detected from handler).",
      });
    } else if (name === "page" || name === "offset") {
      out.push({
        name,
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 0 },
      });
    } else {
      out.push({
        name,
        in: "query",
        required: false,
        schema: { type: "string" },
      });
    }
  }
  return out;
}

function multerFieldsFromSnippet(snippet) {
  /** @type {string[]} */
  const fields = [];
  const g1 =
    /\.single\s*\(\s*["']([\w$-]+)["']\s*\)|\.single\s*\(\s*`([^`]+)`\s*\)/g;
  let m;
  while ((m = g1.exec(snippet)) !== null) fields.push(m[1] || m[2]);
  const g2 = /\.(?:array|fields)\s*\(\s*[\s\S]*?["']([\w$-]+)["']/g;
  while ((m = g2.exec(snippet)) !== null) fields.push(m[1]);
  return [...new Set(fields.filter(Boolean))];
}

function singularizeResource(seg) {
  const s = seg.replace(/[{}]/g, "").replace(/Id$/i, "");
  if (s.endsWith("ies")) return s.slice(0, -3) + "y";
  if (/(ches|shes|sses)$/.test(s)) return s.replace(/es$/, "");
  if (s.endsWith("s") && !s.endsWith("ss")) return s.slice(0, -1);
  return s;
}

function humanResourcePhrase(segments) {
  if (segments.length === 0) return "resource";
  const last = segments[segments.length - 1];
  const lastIsParam = /^\{.+\}$/.test(last);
  const prev = lastIsParam && segments.length >= 2 ? segments[segments.length - 2] : last;
  const base = lastIsParam ? singularizeResource(prev) : last;
  return base.replace(/-/g, " ");
}

function synthesizeSummaryAndDescription(verbU, openapiPath) {
  const sem =
    openapiPath.startsWith("/api/v1/")
      ? `/api/${openapiPath.slice("/api/v1/".length)}`
      : openapiPath;
  const tail = sem.replace(/^\/api\//, "").split("/").filter(Boolean);
  const lastSeg = tail[tail.length - 1] || "";
  const hasParamEnd = !!(
    lastSeg &&
    (lastSeg.startsWith(":") || /^\{[^}]+\}$/.test(lastSeg))
  );
  const resource = humanResourcePhrase(
    tail.map((seg) => (seg.startsWith(":") ? `{${seg.slice(1)}}` : seg)),
  );
  const resourceTitle = resource.charAt(0).toUpperCase() + resource.slice(1);
  const v = verbU.toUpperCase();

  if (openapiPath === "/health") {
    return { summary: "Liveness probe", description: "Returns JSON status for probes." };
  }

  let summary = "";
  let description = "";

  if (v === "GET" && !hasParamEnd) {
    summary = `List ${resourceTitle}`.slice(0, 60);
    description = `Returns a collection of ${resource} entries.`;
  } else if (v === "GET" && hasParamEnd) {
    summary = `Get ${resourceTitle}`.slice(0, 60);
    description = `Fetches one ${resource} resource by identifier.`;
  } else if (v === "POST") {
    const leaf =
      tail.filter((s) => !s.startsWith(":")).slice(-1)[0] || tail[tail.length - 1] || "";
    if (
      /generate|advanced|describe|run|clone|train|checkout|upload|session|blob|intent|stripe/i.test(
        leaf,
      )
    ) {
      summary = `Submit ${resourceTitle}`.slice(0, 60);
    } else {
      summary = `Create ${resourceTitle}`.slice(0, 60);
    }
    description = `Performs processing or persistence for ${resource}.`;
  } else if (v === "PUT") {
    summary = `Update ${resourceTitle}`.slice(0, 60);
    description = `Replaces stored fields for a ${resource}.`;
  } else if (v === "PATCH") {
    summary = `Modify ${resourceTitle}`.slice(0, 60);
    description = `Applies partial updates on ${resource}.`;
  } else if (v === "DELETE") {
    summary = `Delete ${resourceTitle}`.slice(0, 60);
    description = `Deletes a ${resource}.`;
  } else {
    summary = `${v} ${resourceTitle}`.slice(0, 60);
    description = `${v} for ${resource}.`;
  }

  return { summary, description };
}

function openapiTemplateLookupKey(verbU, openapiPath) {
  const sem =
    openapiPath.startsWith("/api/v1/")
      ? `/api/${openapiPath.slice("/api/v1/".length)}`
      : openapiPath;
  return `${verbU.toUpperCase()} ${expressPathToOpenApi(sem)}`;
}

function lookupResponseSchemaRule(verbU, openapiPath) {
  return ROUTE_RESPONSE_SCHEMAS[openapiTemplateLookupKey(verbU, openapiPath)] ?? null;
}

function mdOverrideKeyFromOpenapi(verbU, openapiPath) {
  const t = openapiTemplateLookupKey(verbU, openapiPath).replace(/^[^\s]+\s+/, "").replace(/^\/api\/?/,"");
  return `${verbU.toUpperCase()}__${t.replace(/\//g,"__").replace(/\{([^}]+)\}/g,"$1")}`;
}

const INLINE_ARBITRARY_JSON = {
  type: "object",
  additionalProperties: true,
  description: "Route-defined JSON envelope (no static schema mined).",
};

function buildTyped200Response(mapEntry) {
  if (!mapEntry) return null;
  if (mapEntry.ref === "AnyJsonPayload") {
    return {
      description: "Structured JSON envelope.",
      content: {
        "application/json": { schema: { ...INLINE_ARBITRARY_JSON } },
      },
    };
  }
  if (mapEntry.ref) {
    return {
      description: "Structured JSON envelope.",
      content: {
        "application/json": { schema: { $ref: `#/components/schemas/${mapEntry.ref}` } },
      },
    };
  }
  if (mapEntry.paginated) {
    const item =
      mapEntry.paginated === "AnyJsonPayload"
        ? { ...INLINE_ARBITRARY_JSON }
        : { $ref: `#/components/schemas/${mapEntry.paginated}` };
    return {
      description: "Paginated collection.",
      content: {
        "application/json": {
          schema: {
            allOf: [
              { $ref: "#/components/schemas/Paginated" },
              { type: "object", properties: { data: { type: "array", items: item } } },
            ],
          },
        },
      },
    };
  }
  return null;
}

function routeDeclLineApprox(content, verbLc, routePath) {
  const esc = escapeRe(routePath);
  const re = new RegExp(`(?:router|app)\\.${verbLc}\\(\\s*['"]${esc}['"]`);
  const m = re.exec(content);
  if (!m) return null;
  return content.slice(0, m.index).split("\n").length + 1;
}

function isDeprecatedLegacyApiMirror(verbU, openapiPath, openapiKeySet) {
  if (!openapiPath.startsWith("/api/") || openapiPath.startsWith("/api/v1/")) return false;
  if (openapiPath.startsWith("/api/flows")) return false;
  const rest = openapiPath.slice("/api".length);
  const twinKey = `${verbU}\t/api/v1${rest}`;
  return openapiKeySet.has(twinKey);
}

/**
 * Static enrichment — JSDoc + markdown overrides + validator mining +
 * **`x-modelclone-generated-from`** (+ deprecated legacy SPA mirrors).
 * @param {GeneratedOp} op
 */
function enrichOperationFromRoute(op, verbU, openapiPath, meta, ctx) {
  const { mdMap, openapiKeySet } = ctx;
  op["x-modelclone-generated-from"] = meta.source;

  const adminOnly = isAdminPath(openapiPath);
  const isPublic = isPublicOperation(verbU, openapiPath);
  const verbLc = verbU.toLowerCase();
  const fragments = meta.fragments || [];

  const content =
    meta.source === "src/server.js" ? "" : routeFileContent(meta.source);

  let snippet = "";
  for (const frag of fragments) {
    snippet = routeMiddlewareSnippet(content, verbLc, frag, 14000);
    if (snippet) break;
  }

  const lineHint =
    fragments.length && content ? routeDeclLineApprox(content, verbLc, fragments[0]) : null;

  if (isDeprecatedLegacyApiMirror(verbU, openapiPath, openapiKeySet)) {
    op.deprecated = true;
  }

  if (!adminOnly) {
    let jsdoc = "";
    for (const frag of fragments) {
      jsdoc = jsdoc || jsdocSentenceAboveRoute(content, verbLc, frag);
    }

    const mdKey = mdOverrideKeyFromOpenapi(verbU, openapiPath);
    const mdText = (mdMap && mdMap[mdKey]) || "";
    const synth = synthesizeSummaryAndDescription(verbU, openapiPath);

    let description = jsdoc || mdText || synth.description;
    let summary = synth.summary;
    const firstMd = mdText.split("\n").map((l) => l.trim()).find(Boolean);
    if (mdText && !jsdoc && firstMd && firstMd.length <= 90) summary = firstMd.slice(0, 60);

    if (/subscriptionAllowsSelfServeApiKey|API_KEY_REQUIRES_PAID_PLAN/.test(snippet)) {
      description +=
        "\n\n**Eligibility:** Error **`API_KEY_REQUIRES_PAID_PLAN`** can appear when a **`mcl_`** key lacks a qualifying paid/trial tier.";
    }
    if (op.deprecated) {
      description +=
        "\n\n**Legacy SPA path:** Canonical integrator prefix is **`/api/v1/…`** — prefer migrating off this alias.";
    }

    op.summary = summary;
    op.description = description;
  }

  const schemaRule = lookupResponseSchemaRule(verbU, openapiPath);
  const typed = buildTyped200Response(schemaRule);
  if (typed && op.responses && op.responses["200"] && !(verbU === "GET" && openapiPath === "/health")) {
    op.responses["200"] = typed;
  }

  /** @type {Map<string, unknown>} */
  const pmerge = new Map();
  for (const p of op.parameters || []) {
    const key = `${/** @type {any} */ (p).in}:${/** @type {any} */ (p).name}`;
    pmerge.set(key, { ...p });
  }

  const qFlat = mineKindFromSnippet(snippet, "query");
  const qSchema = mergeDottedTree(qFlat);
  if (qSchema.properties && Object.keys(qSchema.properties).length > 0) {
    const reqArr = Array.isArray(qSchema.required) ? qSchema.required : [];
    for (const [name, sch] of Object.entries(qSchema.properties)) {
      const key = `query:${name}`;
      const existing = /** @type {any} */ (pmerge.get(key));
      pmerge.set(key, {
        ...(existing || {}),
        name,
        in: "query",
        required: reqArr.includes(name),
        schema: sch,
      });
    }
  }
  for (const hp of mineHeuristicQueryParams(snippet)) {
    const key = `query:${hp.name}`;
    if (!pmerge.has(key)) pmerge.set(key, hp);
  }
  if (pmerge.size) {
    op.parameters = [...pmerge.values()].sort((a, b) => {
      const o = /** @type {Record<string, number>} */ ({ path: 0, header: 1, query: 2 });
      const ain = /** @type {any} */ (a).in;
      const bin = /** @type {any} */ (b).in;
      if ((o[ain] ?? 9) !== (o[bin] ?? 9)) return (o[ain] ?? 9) - (o[bin] ?? 9);
      return String(/** @type {any} */ (a).name).localeCompare(String(/** @type {any} */ (b).name));
    });
  }

  const mut = verbU === "POST" || verbU === "PUT" || verbU === "PATCH";
  const semLower = semanticApiPath(openapiPath).toLowerCase();

  const skipBodyMining =
    isPublic ||
    /\bwebhook\b/i.test(semLower) ||
    /\/runs\/.+\/stream\b|\b\/stream\b/.test(openapiPath) ||
    /\b(upload|multipart|blob)\b/i.test(semLower) ||
    /voice\/clone|voices\/clone/.test(semLower);

  if (mut && !skipBodyMining) {
    const files = multerFieldsFromSnippet(snippet);
    const bFlat = mineKindFromSnippet(snippet, "body");

    const usedMultipartAlready =
      op.requestBody &&
      /** @type {any} */ (op.requestBody).content &&
      /** @type {any} */ (op.requestBody).content["multipart/form-data"];

    if (files.length > 0 && !usedMultipartAlready) {
      /** @type {Record<string, unknown>} */
      const props = {};
      for (const f of files) {
        props[f] = {
          type: "string",
          format: "binary",
          description: "`multipart/form-data` part (binary).",
        };
      }
      const mergedSidecar = mergeDottedTree(bFlat);
      if (mergedSidecar.properties && Object.keys(mergedSidecar.properties).length > 0) {
        for (const [k, sch] of Object.entries(mergedSidecar.properties)) {
          if (!props[k]) props[k] = sch;
        }
      }
      op.requestBody = {
        required: true,
        content: {
          "multipart/form-data": { schema: { type: "object", properties: props } },
        },
      };
    } else if (Object.keys(bFlat).length > 0) {
      op.requestBody = {
        required: true,
        content: { "application/json": { schema: mergeDottedTree(bFlat) } },
      };
    } else if (genericJsonStubIfMutating(openapiPath, verbU, semLower)) {
      op.requestBody = {
        required: false,
        description:
          `Request shape not statically extracted from **express-validator**. Inspect source **${meta.source}**` +
          (lineHint ? ` (~line **${lineHint}**)` : "") +
          ` or add **docs/openapi/overrides/${mdOverrideKeyFromOpenapi(verbU, openapiPath)}.md**.`,
        content: {
          "application/json": { schema: { ...INLINE_ARBITRARY_JSON } },
        },
      };
    }
  }
}

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

/** Express `:id` → `{id}` */
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
  /** @type {Map<string, string>} */
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
  /** @type {Map<string, Set<string>>} */
  const prefixByRouteFile = new Map();

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
  const nested = [];
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
  const normalized = fullPath.replace(/^\/api\/v1\//, "/api/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts[0] === "api") parts.shift();
  const first = parts[0] || "root";
  if (first === "admin" || normalized.includes("/admin/")) return "Admin";
  if (first === "stripe" || first === "crypto") return "Billing";
  if (first === "auth") return "Auth";
  if (first === "generate" || first === "nsfw" || first === "models") return "AI & media";
  if (first === "flows") return "Flows Studio";
  if (first === "img2img" || first === "gptx") return "Tools";
  if (first === "support" || first === "referrals") return "Account";
  return "API";
}

/** `/api/v1/foo` ⇒ `/api/foo` comparison key */
function semanticApiPath(openapiPath) {
  return openapiPath.startsWith("/api/v1/")
    ? `/api/${openapiPath.slice("/api/v1/".length)}`
    : openapiPath;
}

function openapiPathHasTemplate(openapiPath) {
  return /\{[^}]+\}/.test(openapiPath);
}

/** OpenAPI 3 **`parameters`** entries for `{pathVars}`. */
function parametersForOpenapiPath(pathKey) {
  const names = [...pathKey.matchAll(/\{([^/}]+)\}/g)].map((m) => m[1]);
  if (!names.length) return undefined;
  return names.map((name) => ({
    name,
    in: "path",
    required: true,
    schema: { type: "string" },
    description: `${name.replace(/_/g, " ")} segment from the HTTP path.`,
  }));
}

function idempotencyHeaderParameter() {
  return {
    name: "Idempotency-Key",
    in: "header",
    required: false,
    schema: { type: "string", minLength: 8 },
    description:
      "Optional idempotency / replay-protection token for safe retries (conventional HTTP header — enforcement is route-specific).",
  };
}

function isPublicOperation(verbU, openapiPath) {
  const sem = semanticApiPath(openapiPath);
  return PUBLIC_METHOD_PATHS.has(`${verbU}\t${sem}`);
}

function isAdminPath(openapiPath) {
  const sem = semanticApiPath(openapiPath);
  return sem === "/api/admin" || sem.startsWith("/api/admin/");
}

/** POST/PUT/PATCH that may debit credits vs route economics. */
function mayDebitCredits(semanticLower, verbU) {
  const v = verbU.toUpperCase();
  if (v !== "POST" && v !== "PUT" && v !== "PATCH") return false;
  if (semanticLower.startsWith("/api/auth/")) return false;
  return (
    /stripe|billing|checkout|purchase|credit|coupon|discount|withdraw|deposit|invoice|subscription/.test(
      semanticLower,
    ) ||
    /generate|nsfw|img2img|upscale|\/lora\b|\/voices?\b|\/voice\b/.test(semanticLower) ||
    /\/models\//.test(semanticLower) ||
    /\/flows\/.+\/run\b/.test(semanticLower)
  );
}

function mayMultipartOr413(semanticLower, verbU) {
  const v = verbU.toUpperCase();
  if (v !== "POST" && v !== "PUT" && v !== "PATCH") return false;
  return (
    /upload|multipart|blob|voice\/clone|voices\/clone|training|photos|videos?|attachments|avatars?/.test(
      semanticLower,
    ) ||
    /\/admin\//.test(semanticLower)
  );
}

/** Default JSON stub for codegen — **required:false** avoids false strictness. */
function genericJsonStubIfMutating(openapiPath, verbU, semanticLower) {
  const v = verbU.toUpperCase();
  if (v !== "POST" && v !== "PUT" && v !== "PATCH") return undefined;
  if (/upload|multipart|blob|voice\/clone|voices\/clone|webhook|stream/i.test(semanticLower)) return undefined;
  return {
    required: false,
    description:
      "JSON body when route accepts **`application/json`** — fields are route-specific. Prefer curated overrides + **`docs/API_GENERATION_UX_PARITY.md`** for generation flows.",
    content: {
      "application/json": {
        schema: { ...INLINE_ARBITRARY_JSON },
      },
    },
  };
}

/**
 * Verb-tailored **`responses`** (no shotgun 413 on **`GET /health`).
 * @param {object} opts
 */
function responsesForVerb(verbU, openapiPath, opts) {
  const { authenticated, adminOnly } = opts;
  const sem = semanticApiPath(openapiPath);
  const sLower = sem.toLowerCase();

  if (openapiPath === "/health" && verbU === "GET") {
    return {
      "200": RESPONSE.HealthOk200,
      "503": RESPONSE.ServiceUnavailable503,
    };
  }

  const v = verbU.toUpperCase();
  /** @type {Record<string, unknown>} */
  const out = {};

  if (v === "GET" || v === "HEAD") {
    out["200"] = RESPONSE.SuccessOk;
    if (authenticated) out["401"] = RESPONSE.Unauthorized;
    if (authenticated) out["403"] = RESPONSE.Forbidden403;
    if (openapiPathHasTemplate(openapiPath)) out["404"] = RESPONSE.NotFound404;
    out["429"] = RESPONSE.RateLimited429;
    out["500"] = RESPONSE.Internal500;
    out["503"] = RESPONSE.ServiceUnavailable503;
    return out;
  }

  if (v === "DELETE") {
    out["200"] = RESPONSE.SuccessOk;
    if (authenticated) out["401"] = RESPONSE.Unauthorized;
    if (authenticated) out["403"] = RESPONSE.Forbidden403;
    out["404"] = RESPONSE.NotFound404;
    out["409"] = RESPONSE.Conflict409;
    out["429"] = RESPONSE.RateLimited429;
    out["500"] = RESPONSE.Internal500;
    out["503"] = RESPONSE.ServiceUnavailable503;
    return out;
  }

  // Mutating verbs
  out["200"] = RESPONSE.SuccessOk;
  out["400"] = RESPONSE.ValidationFailed400;
  if (authenticated) out["401"] = RESPONSE.Unauthorized;
  if (!adminOnly && mayDebitCredits(sLower, verbU)) out["402"] = RESPONSE.PaymentRequired402;
  if (authenticated) out["403"] = RESPONSE.Forbidden403;
  if (openapiPathHasTemplate(openapiPath)) out["404"] = RESPONSE.NotFound404;
  out["409"] = RESPONSE.Conflict409;
  if (mayMultipartOr413(sLower, verbU)) out["413"] = RESPONSE.PayloadTooLarge413;
  out["429"] = RESPONSE.RateLimited429;
  out["500"] = RESPONSE.Internal500;
  out["503"] = RESPONSE.ServiceUnavailable503;

  return out;
}

/** @typedef {{ operationId: string, summary: string, description: string, tags: string[], parameters?: unknown[], responses: Record<string, unknown>, security?: unknown[], requestBody?: unknown, deprecated?: boolean, "x-internal"?: boolean }} GeneratedOp */

/**
 * @param {string} verb uppercase
 */
function buildDefaultOperation(verb, openapiPath, sourceFile, tag) {
  const mutating =
    verb === "POST" || verb === "PUT" || verb === "PATCH" || verb === "DELETE";
  const rawOpId =
    `${verb}_${openapiPath.replace(/\{([^}]+)\}/g, ":$1")}`.toLowerCase();

  const sem = semanticApiPath(openapiPath);
  const isPublic = isPublicOperation(verb, openapiPath);
  const adminOnly = isAdminPath(openapiPath);
  const authenticated = !isPublic && sem.startsWith("/api/");

  const synth = synthesizeSummaryAndDescription(verb, openapiPath);

  /** @type {GeneratedOp} */
  const base = {
    operationId: rawOpId.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 120) || "op",
    summary:
      verb === "GET" && openapiPath === "/health" ? "Liveness probe" : synth.summary,
    description:
      adminOnly || tag === "Admin"
        ? `**Internal admin-only** (**\`${sourceFile}\`**). Session JWT enforced — \`mcl_\` REST keys are rejected (**ADMIN_SESSION_ONLY**).`
        : synth.description,
    tags: [tag],
    responses: responsesForVerb(verb, openapiPath, { authenticated, adminOnly }),
  };

  const pathParams = parametersForOpenapiPath(openapiPath) || [];
  const params = [...pathParams];
  if (mutating && !isPublic && verb !== "DELETE") params.push(idempotencyHeaderParameter());
  if (params.length) base.parameters = params;

  if (adminOnly) {
    base.security = [{ SessionCookieAuth: [] }];
    base["x-internal"] = true;
  } else if (isPublic) base.security = [];

  return base;
}

function mergeOperation(base, overlay) {
  if (!overlay) return base;

  /** @type {GeneratedOp & Record<string, unknown>} */
  const out = /** @type {any} */ ({ ...base });
  const {
    responses: overlayResponses,
    tags: overlayTags,
    parameters: overlayParams,
    ...restOverlay
  } = overlay;

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

  if (overlayParams !== undefined && Array.isArray(overlayParams)) {
    /** @type {Map<string, any>} */
    const merged = new Map();
    for (const p of base.parameters || []) {
      const nm = /** @type {any} */ (p).name;
      if (nm) merged.set(nm, { ...(typeof p === "object" ? p : {}) });
    }
    for (const p of overlayParams) {
      const nm = /** @type {any} */ (p).name;
      if (!nm) continue;
      merged.set(nm, { ...(merged.get(nm) || {}), ...p });
    }
    out.parameters = [...merged.values()];
  }

  return out;
}

/** Prefer readable ordering for generated YAML (parameters before responses, etc.). */
function normalizeOperationFieldOrder(op) {
  /** @type {Record<string, unknown>} */
  const out = {};
  const keys = [
    "operationId",
    "summary",
    "description",
    "tags",
    "deprecated",
    "x-modelclone-generated-from",
    "x-internal",
    "parameters",
    "security",
    "requestBody",
    "responses",
  ];
  const seen = new Set();
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(op, k) && /** @type {any} */ (op)[k] !== undefined) {
      out[k] = /** @type {any} */ (op)[k];
      seen.add(k);
    }
  }
  for (const [k, v] of Object.entries(op)) {
    if (!seen.has(k) && v !== undefined) out[k] = v;
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

  doc.security ??= [{ SessionCookieAuth: [] }, { ApiKeyAuth: [] }, { BearerAuth: [] }];

  const prefixByFile = buildPrefixMap();
  const mdMap = loadMarkdownOverrideMap();

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

  /** @type {Map<string, { method: string, tags: Set<string>, source: string, fragments: Set<string> }>} */
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
          fragments: new Set([p]),
        });
      } else {
        const ent = operations.get(opKey);
        ent.tags.add(tag);
        ent.fragments.add(p);
      }
    }
  }

  /** After OpenAPI-path normalization: `GET\t/api/v1/foo/{id}` */
  const openapiKeySet = new Set();
  for (const [k] of operations) {
    const sp = k.indexOf(" ");
    openapiKeySet.add(
      `${k.slice(0, sp)}\t${expressPathToOpenApi(k.slice(sp + 1))}`,
    );
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

    enrichOperationFromRoute(
      op,
      verb,
      pathKey,
      { ...meta, fragments: [...meta.fragments] },
      { mdMap, openapiKeySet },
    );

    const ov = getClientOpenApiOverride(pathKey, method);
    op = normalizeOperationFieldOrder(mergeOperation(op, ov));
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
    )} (${sortedOps.length} operations, ${sortedPaths.length} paths; legacy /api mirrors flagged deprecated when /api/v1 exists)`,
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