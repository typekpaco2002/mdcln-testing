#!/usr/bin/env node
/**
 * Codemod: rewrite every `from 'lucide-react'` and `from 'react-icons/si'`
 * import source in client/src to `from '@/components/icons'`.
 *
 * Why a regex codemod (instead of jscodeshift):
 *   - The import-specifier list itself does NOT change. The shim re-exports
 *     every symbol under its legacy name. Only the source string changes.
 *   - Multi-line imports are fine: we anchor on `from\s*['"]<package>['"]`
 *     which is a non-line-sensitive match.
 *
 * Skipped:
 *   - client/src/components/icons/index.js (the shim itself; it intentionally
 *     imports from lucide-react and react-icons/si as fallbacks).
 *
 * Output:
 *   - Edits files in place.
 *   - Prints a per-file diff summary.
 *   - Writes .multitask/icon-swap/codemod-report.json with full results.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(__filename, '..', '..');
const SRC_ROOT = join(REPO_ROOT, 'client', 'src');
const SHIM_REL = 'client/src/components/icons/index.js';
const IO_DIR = join(REPO_ROOT, '.multitask', 'icon-swap');

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

// Match `from <quote><package><quote>` with both quote styles.
// The codemod rewrites the source string but preserves the original quote style.
const LUCIDE_RE = /from\s*(['"])lucide-react\1/g;
const SI_RE = /from\s*(['"])react-icons\/si\1/g;

const files = walk(SRC_ROOT);
const results = []; // { file, lucideHits, siHits }

for (const full of files) {
  const rel = relative(REPO_ROOT, full).split(sep).join('/');
  if (rel === SHIM_REL) continue;

  const before = readFileSync(full, 'utf8');
  let lucideHits = 0;
  let siHits = 0;

  const after = before
    .replace(LUCIDE_RE, (_, q) => {
      lucideHits += 1;
      return `from ${q}@/components/icons${q}`;
    })
    .replace(SI_RE, (_, q) => {
      siHits += 1;
      return `from ${q}@/components/icons${q}`;
    });

  if (after !== before) {
    writeFileSync(full, after);
    results.push({ file: rel, lucideHits, siHits });
  }
}

mkdirSync(IO_DIR, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  filesScanned: files.length,
  filesChanged: results.length,
  totalLucideRewrites: results.reduce((s, r) => s + r.lucideHits, 0),
  totalSiRewrites: results.reduce((s, r) => s + r.siHits, 0),
  changes: results.sort((a, b) => a.file.localeCompare(b.file)),
};
writeFileSync(join(IO_DIR, 'codemod-report.json'), JSON.stringify(report, null, 2));

console.log(`Scanned: ${report.filesScanned} files`);
console.log(`Changed: ${report.filesChanged} files`);
console.log(`  lucide-react -> @/components/icons : ${report.totalLucideRewrites} rewrites`);
console.log(`  react-icons/si -> @/components/icons : ${report.totalSiRewrites} rewrites`);
console.log(`Report: ${IO_DIR}/codemod-report.json`);
