#!/usr/bin/env node
/**
 * Static sanity check: parses every phosphor name referenced by the generated
 * shim and verifies each one is declared in @phosphor-icons/react's index.d.ts.
 * Avoids a heavy dynamic import of the package (which has 1500+ components and
 * is slow to evaluate). Exits non-zero with the list of missing names.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(__filename, '..', '..');
const SHIM_PATH = join(REPO_ROOT, 'client', 'src', 'components', 'icons', 'index.js');
const PHOSPHOR_DTS = join(REPO_ROOT, 'node_modules', '@phosphor-icons', 'react', 'dist', 'index.d.ts');
const PHOSPHOR_CSR_DIR = join(REPO_ROOT, 'node_modules', '@phosphor-icons', 'react', 'dist', 'csr');

const shim = readFileSync(SHIM_PATH, 'utf8');
const indexDts = readFileSync(PHOSPHOR_DTS, 'utf8');

const PHOSPHOR_LINE_RE = /export\s*\{([^}]+)\}\s*from\s*'@phosphor-icons\/react'/g;
const phosphorNames = new Set();
let m;
while ((m = PHOSPHOR_LINE_RE.exec(shim)) !== null) {
  for (const raw of m[1].split(',')) {
    const part = raw.trim();
    if (!part) continue;
    const original = part.split(/\s+as\s+/)[0].trim();
    if (original) phosphorNames.add(original);
  }
}

// Phosphor uses one re-export per icon file:
//   export * from './csr/Acorn';
// So an icon "X" exists iff (a) it is referenced from index.d.ts AND
// (b) the corresponding ./csr/X.d.ts file is present in node_modules.
const known = new Set();
const CSR_RE = /export\s*\*\s*from\s*'\.\/csr\/([A-Za-z0-9_]+)'/g;
let mm;
while ((mm = CSR_RE.exec(indexDts)) !== null) known.add(mm[1]);

const missing = [...phosphorNames].filter((n) => !known.has(n)).sort();

console.log(`Phosphor names referenced in shim: ${phosphorNames.size}`);
console.log(`Phosphor known exports in dist/index.d.ts: ${known.size}`);
console.log(`Matched: ${phosphorNames.size - missing.length}`);
if (missing.length) {
  console.error('\nMISSING phosphor exports (fix in scripts/icon-shim-build.mjs LUCIDE_TO_PHOSPHOR):');
  for (const n of missing) console.error(`  - ${n}`);
  process.exit(1);
}
console.log('All referenced phosphor names resolve cleanly.');
