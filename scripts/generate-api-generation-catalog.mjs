#!/usr/bin/env node
/**
 * Regenerates docs/generated/API_GENERATION_CATALOG.md — generation-adjacent routes.
 * /api/v1 mirrors the same suffix as /api (except /api/flows).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "generated", "API_GENERATION_CATALOG.md");

/** [file, urlPrefix appended to matching paths] */
const ROUTE_FILES = [
  ["src/routes/api.routes.js", ""],
  ["src/routes/img2img.routes.js", "/img2img"],
  ["src/routes/gptx.routes.js", "/gptx"],
  ["src/routes/video-repurpose.routes.js", "/video-repurpose"],
  ["src/routes/viral-reels.routes.js", "/viral-reels"],
];

const ROUTER_LINE =
  /\brouter\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/g;

function isHeavyCatalogPath(apiPath) {
  return (
    apiPath.includes("/generate") ||
    apiPath.includes("/generations") ||
    apiPath.includes("/modelclone-x") ||
    apiPath.includes("/nsfw") ||
    apiPath.includes("/voices") ||
    apiPath.includes("/upscale") ||
    apiPath.includes("/synthid") ||
    apiPath.includes("/img2img") ||
    apiPath.includes("/gptx") ||
    apiPath.includes("/video-repurpose") ||
    apiPath.includes("/viral-reels") ||
    apiPath.includes("/creator-studio") ||
    apiPath.includes("/talking-head") ||
    apiPath.includes("/prompt-image") ||
    apiPath.includes("/image-identity")
  );
}

function extract(fileRel) {
  const full = path.join(ROOT, fileRel);
  if (!fs.existsSync(full)) return [];
  const text = fs.readFileSync(full, "utf8");
  const rows = [];
  let m;
  while ((m = ROUTER_LINE.exec(text)) !== null) {
    rows.push({ verb: m[1].toUpperCase(), path: m[2] });
  }
  return rows;
}

function main() {
  const rows = [];

  for (const [rel, suffix] of ROUTE_FILES) {
    for (const r of extract(rel)) {
      const suffixPart = suffix + (r.path.startsWith("/") ? r.path : `/${r.path}`);
      const integrated = `/api${suffixPart}`;
      if (!isHeavyCatalogPath(integrated)) continue;

      rows.push({
        verb: r.verb,
        integrated,
        v1: `/api/v1${suffixPart}`,
        file: rel,
      });
    }
  }

  rows.sort((a, b) => `${a.integrated}:${a.verb}`.localeCompare(`${b.integrated}:${b.verb}`));

  let md = `# API generation catalog (auto-generated)\n\n`;
  md += `_Regenerate: \`node scripts/generate-api-generation-catalog.mjs\` (also invoked from \`npm run docs:registry\`)._\n\n`;
  md +=
    "Use **`/api/v1` + same suffix** as **`/api`** for integrations. Flow Studio remains **`/api/flows` only**.\n\n";
  md += "| Verb | Path (integration) | Source |\n";
  md += "|------|-------------------|--------|\n";
  for (const r of rows) {
    md += `| ${r.verb} | \`${r.v1}\` | \`${r.file}\` |\n`;
  }
  md += `\n## Field-level UX notes\n\n`;
  md += `See **\`docs/API_GENERATION_UX_PARITY.md\`** (manual) for ModelClone-X / enhance / custom-prompt flags.\n`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, md);
  console.log(`Wrote ${path.relative(ROOT, OUT)} (${rows.length} rows)`);
}

main();
