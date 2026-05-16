#!/usr/bin/env node
/**
 * Scans client/src for every lucide-react + react-icons/si import.
 * Emits:
 *   - .multitask/icon-swap/inventory.json  (machine-readable)
 *   - .multitask/icon-swap/INVENTORY.md    (human-readable summary)
 *
 * Per symbol we record: usageCount (how many import statements reference it),
 *                       fileCount  (in how many distinct files),
 *                       files      (sorted list of files using it).
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(__filename, '..', '..');
const SRC_ROOT = join(REPO_ROOT, 'client', 'src');
const OUT_DIR = join(REPO_ROOT, '.multitask', 'icon-swap');

const EXT = new Set(['.js', '.jsx', '.ts', '.tsx']);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === 'build' || entry.startsWith('.')) continue;
      walk(full, acc);
    } else {
      const dot = entry.lastIndexOf('.');
      if (dot !== -1 && EXT.has(entry.slice(dot))) acc.push(full);
    }
  }
  return acc;
}

// Matches:
//   import { Foo, Bar as Baz, Qux } from 'lucide-react';
//   import {
//     Foo,
//     Bar,
//   } from 'react-icons/si';
// Captures the brace contents and the package.
const IMPORT_RE = /import\s*\{([^}]+)\}\s*from\s*['"](lucide-react|react-icons\/si)['"]/g;

const inv = {
  lucide: new Map(),       // symbol -> { usageCount, files: Set }
  reactIconsSi: new Map(),
};

const files = walk(SRC_ROOT);
let importStatementsSeen = 0;

for (const file of files) {
  const txt = readFileSync(file, 'utf8');
  let m;
  while ((m = IMPORT_RE.exec(txt)) !== null) {
    importStatementsSeen += 1;
    const inside = m[1];
    const pkg = m[2];
    const map = pkg === 'lucide-react' ? inv.lucide : inv.reactIconsSi;
    const rel = relative(REPO_ROOT, file).split(sep).join('/');

    // Split by comma, strip whitespace and `as alias` clauses.
    for (const raw of inside.split(',')) {
      const part = raw.trim();
      if (!part) continue;
      // Drop comments/newlines noise that survived the comma split.
      const clean = part.replace(/\/\/.*$/, '').trim();
      if (!clean) continue;
      // Keep the source symbol (left side of `as`).
      const symbol = clean.split(/\s+as\s+/)[0].trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol)) continue;

      if (!map.has(symbol)) map.set(symbol, { usageCount: 0, files: new Set() });
      const rec = map.get(symbol);
      rec.usageCount += 1;
      rec.files.add(rel);
    }
  }
}

function toSorted(map) {
  return [...map.entries()]
    .map(([symbol, rec]) => ({
      symbol,
      usageCount: rec.usageCount,
      fileCount: rec.files.size,
      files: [...rec.files].sort(),
    }))
    .sort((a, b) => b.fileCount - a.fileCount || a.symbol.localeCompare(b.symbol));
}

const lucide = toSorted(inv.lucide);
const reactIconsSi = toSorted(inv.reactIconsSi);

mkdirSync(OUT_DIR, { recursive: true });

const json = {
  generatedAt: new Date().toISOString(),
  filesScanned: files.length,
  importStatementsSeen,
  totals: {
    lucideUniqueSymbols: lucide.length,
    reactIconsSiUniqueSymbols: reactIconsSi.length,
  },
  lucide,
  reactIconsSi,
};
writeFileSync(join(OUT_DIR, 'inventory.json'), JSON.stringify(json, null, 2));

// Markdown report
const lines = [];
lines.push('# Icon inventory');
lines.push('');
lines.push(`Generated: ${json.generatedAt}`);
lines.push(`Source root: \`client/src\``);
lines.push(`Files scanned: **${json.filesScanned}**`);
lines.push(`Import statements parsed: **${json.importStatementsSeen}**`);
lines.push(`Unique \`lucide-react\` symbols: **${json.totals.lucideUniqueSymbols}**`);
lines.push(`Unique \`react-icons/si\` symbols: **${json.totals.reactIconsSiUniqueSymbols}**`);
lines.push('');

lines.push('## lucide-react (sorted by file-count desc)');
lines.push('');
lines.push('| Symbol | Files | Imports |');
lines.push('|---|---:|---:|');
for (const row of lucide) lines.push(`| \`${row.symbol}\` | ${row.fileCount} | ${row.usageCount} |`);
lines.push('');

lines.push('## react-icons/si (sorted by file-count desc)');
lines.push('');
lines.push('| Symbol | Files | Imports |');
lines.push('|---|---:|---:|');
for (const row of reactIconsSi) lines.push(`| \`${row.symbol}\` | ${row.fileCount} | ${row.usageCount} |`);
lines.push('');

writeFileSync(join(OUT_DIR, 'INVENTORY.md'), lines.join('\n'));

console.log(`Scanned ${json.filesScanned} files, parsed ${json.importStatementsSeen} import statements.`);
console.log(`lucide-react unique symbols: ${json.totals.lucideUniqueSymbols}`);
console.log(`react-icons/si unique symbols: ${json.totals.reactIconsSiUniqueSymbols}`);
console.log(`Wrote ${OUT_DIR}/inventory.json and INVENTORY.md`);
