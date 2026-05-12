#!/usr/bin/env node
/**
 * Exhaustive inventories for docs — run after route/schema/page changes:
 *   npm run docs:registry
 *
 * Outputs under docs/generated/ (committed to git).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs", "generated");

function walkFilesByExt(dir, exts, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name.startsWith(".")) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walkFilesByExt(full, exts, acc);
    else if (name.isFile() && exts.some((e) => name.name.endsWith(e)))
      acc.push(full);
  }
  return acc;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

/** Single-line router./app. METHOD('/path') and router.use('/path') */
function extractExpressPaths(content, fileRel) {
  const rows = [];
  const re =
    /\b(?:router|app)\.(get|post|put|patch|delete|use)\s*\(\s*["']([/][^'"\\]*)["']/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    rows.push({
      verb: String(m[1]).toUpperCase(),
      path: m[2],
      file: fileRel,
    });
  }
  return rows;
}

function extractAppJsxRoutes(projectRoot) {
  const appPath = path.join(projectRoot, "client", "src", "App.jsx");
  if (!fs.existsSync(appPath)) return [];
  const text = fs.readFileSync(appPath, "utf8");
  const rows = [];
  const re =
    /<Route\s+[^>]*path\s*=\s*["']([^"']+)["'][^>]*(?:element\s*=\s*\{([^}]+)\}|>)/gs;
  let m;
  while ((m = re.exec(text)) !== null) {
    const pathPart = m[1];
    const element = (m[2] || "").trim().slice(0, 120);
    rows.push({ path: pathPart, componentHint: element || "(see JSX)" });
  }
  const navRe = /<Navigate\s+to\s*=\s*["']([^"']+)["']/g;
  while ((m = navRe.exec(text)) !== null) {
    rows.push({ path: `(redirect)→${m[1]}`, componentHint: "Navigate" });
  }
  return rows;
}

/** Prisma models with field names */
function extractPrismaModels(schemaPath) {
  const text = fs.readFileSync(schemaPath, "utf8");
  const lines = text.split(/\n/);
  const models = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const mm = /^model\s+(\w+)\s*\{/.exec(trimmed);
    if (!mm) continue;
    const name = mm[1];
    i++;
    const fields = [];
    for (; i < lines.length; i++) {
      const t = lines[i].trim();
      if (t === "}") break;
      if (!t || t.startsWith("//") || t.startsWith("///")) continue;
      if (t.startsWith("@@")) continue;
      if (t.startsWith("{")) continue;
      const fm = /^(\w+)\s+/.exec(t);
      if (fm) fields.push(fm[1]);
    }
    models.push({ name, fields });
  }
  models.sort((a, b) => a.name.localeCompare(b.name));
  return models;
}

function listModules(dir, label) {
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".js") || f.endsWith(".mjs") || f.endsWith(".ts"));
  files.sort();
  return files.map((f) => `${label}/${f}`);
}

/** All source-like files under dir (recursive); skip dot dirs */
const COMPONENT_EXTENSIONS = [
  ".jsx",
  ".tsx",
  ".js",
  ".ts",
  ".css",
  ".scss",
];
const SCRIPT_EXTENSIONS = [
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".mts",
  ".cts",
  ".py",
  ".sql",
  ".sh",
  ".json",
  ".md",
];

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const generatedAt = new Date().toISOString();

  const routeFiles = [];
  const serverPath = path.join(ROOT, "src", "server.js");
  if (fs.existsSync(serverPath)) routeFiles.push(serverPath);
  routeFiles.push(...walkFilesByExt(path.join(ROOT, "src", "routes"), [".js"]));

  const allRoutes = [];
  for (const f of routeFiles) {
    let content = fs.readFileSync(f, "utf8");
    const r = rel(f);
    extractExpressPaths(content.replace(/\r\n/g, "\n"), r).forEach((row) =>
      allRoutes.push(row)
    );
    // Second pass: collapse newlines so `router.post(\n'/path'` matches
    const collapsed = content.replace(/[\r\n]+/g, " ");
    extractExpressPaths(collapsed, r).forEach((row) => allRoutes.push(row));
  }
  const seen = new Set();
  const deduped = [];
  for (const row of allRoutes) {
    const k = `${row.verb}\t${row.path}\t${row.file}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(row);
  }
  allRoutes.length = 0;
  allRoutes.push(...deduped);
  allRoutes.sort((a, b) =>
    `${a.file}:${a.path}:${a.verb}`.localeCompare(`${b.file}:${b.path}:${b.verb}`)
  );

  const routesMd = [
    `# Generated: Express route patterns`,
    ``,
    `> Auto-built by **\`npm run docs:registry\`**. Matches **literal** path strings only (e.g. \`router.get('/path')\`).`,
    `> Dynamic paths, template literals, or multi-line route definitions may be missing — add manual rows in \`docs/COVERAGE_INDEX.md\`.`,
    ``,
    `**Generated at:** ${generatedAt}`,
    ``,
    `| Verb | Path | Source file |`,
    `|------|------|-------------|`,
    ...allRoutes.map((row) => `| ${row.verb} | \`${row.path}\` | \`${row.file}\` |`),
    ``,
    `## Count`,
    ``,
    `- **Entries:** ${allRoutes.length}`,
    ``,
  ].join("\n");

  fs.writeFileSync(path.join(OUT_DIR, "HTTP_ROUTES.md"), routesMd);

  const schemaPath = path.join(ROOT, "prisma", "schema.prisma");
  let prismaMd = `# Generated: Prisma models\n\n**Schema:** \`prisma/schema.prisma\`\n\n**Generated at:** ${generatedAt}\n\n`;
  if (fs.existsSync(schemaPath)) {
    const models = extractPrismaModels(schemaPath);
    prismaMd += `## Models (${models.length})\n\n`;
    for (const m of models) {
      prismaMd += `### \`${m.name}\`\n\n`;
      prismaMd +=
        `- **Fields (${m.fields.length}):** ${m.fields.map((x) => `\`${x}\``).join(", ")}\n\n`;
    }
  } else {
    prismaMd += `_schema.prisma not found_\n`;
  }
  fs.writeFileSync(path.join(OUT_DIR, "PRISMA_MODELS.md"), prismaMd);

  const pagesDir = path.join(ROOT, "client", "src", "pages");
  let pagesMd =
    `# Generated: React pages (filenames)\n\n**Generated at:** ${generatedAt}\n\n`;
  const pageFiles = walkFilesByExt(pagesDir, [".jsx", ".tsx"])
    .map(rel)
    .filter((p) => p.endsWith(".jsx") || p.endsWith(".tsx"));
  pageFiles.sort();
  pagesMd += `${pageFiles.length} files:\n\n`;
  pagesMd +=
    pageFiles.map((p) => `- \`${p}\`\n`).join("") + `\n`;

  pagesMd += `## Routes from App.jsx (static path props)\n\n`;
  extractAppJsxRoutes(ROOT).forEach((r) => {
    pagesMd += `- **\`${r.path}\`** — ${r.componentHint}\n`;
  });
  pagesMd += `\n`;
  fs.writeFileSync(path.join(OUT_DIR, "CLIENT_PAGES.md"), pagesMd);

  const hooksDir = path.join(ROOT, "client", "src", "hooks");
  const flowNodesDir = path.join(ROOT, "client", "src", "components", "flows", "nodes");
  let hooksFlowMd = `# Generated: Client hooks & Flows node components\n\n**Generated at:** ${generatedAt}\n\n`;
  const hookFiles = walkFilesByExt(hooksDir, [".js", ".jsx"]).map(rel).sort();
  hooksFlowMd += `## Hooks (${hookFiles.length})\n\n`;
  hooksFlowMd += hookFiles.map((p) => `- \`${p}\`\n`).join("") || `_none_\n`;
  const flowNodeFiles = walkFilesByExt(flowNodesDir, [".jsx"]).map(rel).sort();
  hooksFlowMd += `\n## Flows Studio node components (${flowNodeFiles.length})\n\n`;
  hooksFlowMd += flowNodeFiles.map((p) => `- \`${p}\`\n`).join("") || `_none_\n`;
  fs.writeFileSync(path.join(OUT_DIR, "CLIENT_HOOKS_FLOWS_NODES.md"), hooksFlowMd);

  const storeDir = path.join(ROOT, "client", "src", "store");
  let storeMd = `# Generated: Client Zustand / state files\n\n**Generated at:** ${generatedAt}\n\n`;
  const storeFiles = walkFilesByExt(storeDir, [".js", ".ts"]).map(rel).sort();
  storeMd += storeFiles.map((p) => `- \`${p}\`\n`).join("") || `_none_\n`;
  fs.writeFileSync(path.join(OUT_DIR, "CLIENT_STORE.md"), storeMd);

  const componentsDir = path.join(ROOT, "client", "src", "components");
  let compMd = `# Generated: Client components (all matching files)\n\n**Generated at:** ${generatedAt}\n\n`;
  compMd += `Extensions: \`${COMPONENT_EXTENSIONS.join(", ")}\` — under \`client/src/components/\` only.\n\n`;
  const componentFiles = walkFilesByExt(
    componentsDir,
    COMPONENT_EXTENSIONS
  )
    .map(rel)
    .sort();
  compMd += `**Count:** ${componentFiles.length}\n\n`;
  compMd += componentFiles.map((p) => `- \`${p}\`\n`).join("") || `_none_\n`;
  fs.writeFileSync(path.join(OUT_DIR, "CLIENT_COMPONENTS.md"), compMd);

  const scriptsDir = path.join(ROOT, "scripts");
  let scriptsMd = `# Generated: Repository scripts\n\n**Generated at:** ${generatedAt}\n\n`;
  scriptsMd += `Extensions: \`${SCRIPT_EXTENSIONS.join(", ")}\` — under \`scripts/\` only.\n\n`;
  const scriptFiles = walkFilesByExt(scriptsDir, SCRIPT_EXTENSIONS)
    .map(rel)
    .sort();
  scriptsMd += `**Count:** ${scriptFiles.length}\n\n`;
  scriptsMd += scriptFiles.map((p) => `- \`${p}\`\n`).join("") || `_none_\n`;
  fs.writeFileSync(path.join(OUT_DIR, "SCRIPTS.md"), scriptsMd);

  const ctr = path.join(ROOT, "src", "controllers");
  const svc = path.join(ROOT, "src", "services");
  const mw = path.join(ROOT, "src", "middleware");

  let modMd = `# Generated: Backend module lists\n\n**Generated at:** ${generatedAt}\n\n`;
  modMd += `## Controllers\n\n`;
  modMd +=
    listModules(ctr, "src/controllers")
      .map((x) => `- \`${x}\``)
      .join("\n") || `_none_`;
  modMd += `\n\n## Services\n\n`;
  modMd +=
    listModules(svc, "src/services")
      .map((x) => `- \`${x}\``)
      .join("\n") || `_none_`;
  modMd += `\n\n## Middleware\n\n`;
  modMd +=
    listModules(mw, "src/middleware")
      .map((x) => `- \`${x}\``)
      .join("\n") || `_none_`;

  modMd += `\n\n## Lib (shared server utilities)\n\n`;
  const libDir = path.join(ROOT, "src", "lib");
  const libFiles = walkFilesByExt(libDir, [".js"]).map(rel).sort();
  modMd += libFiles.map((p) => `- \`${p}\`\n`).join("") || `_none_\n`;

  modMd += `\n\n## Shared (client + server)\n\n`;
  const sharedDir = path.join(ROOT, "shared");
  const sharedFiles = walkFilesByExt(sharedDir, [".js", ".ts", ".mjs"]).map(rel).sort();
  modMd +=
    sharedFiles.map((p) => `- \`${p}\`\n`).join("") ||
    `_none (no shared/ folder)_\n`;

  modMd += `\n\n## Route files (tree)\n\n`;
  walkFilesByExt(path.join(ROOT, "src", "routes"), [".js"])
    .map(rel)
    .sort()
    .forEach((p) => {
      modMd += `- \`${p}\`\n`;
    });
  fs.writeFileSync(path.join(OUT_DIR, "BACKEND_MODULES.md"), modMd);

  try {
    execFileSync(process.execPath, [path.join(__dirname, "generate-api-generation-catalog.mjs")], {
      stdio: "inherit",
      cwd: ROOT,
    });
  } catch (e) {
    console.warn("[docs:registry] API generation catalog failed:", e?.message || e);
  }

  console.log(
    `Wrote docs under ${rel(OUT_DIR)}/ (incl. CLIENT_COMPONENTS.md, SCRIPTS.md)`
  );
}

main();
