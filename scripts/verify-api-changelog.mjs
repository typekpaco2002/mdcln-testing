#!/usr/bin/env node
/**
 * Ensures docs/API_CHANGELOG.md is edited when integration routes/middleware change.
 * SKIP_API_CHANGELOG_VERIFY=1 — bypass.
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const TRIGGERS = [
  /^src\/routes\//,
  /^src\/middleware\/(auth\.middleware|admin\.middleware|generation-safety\.middleware|generation-concurrency\.middleware|rateLimiter)\.js$/,
  /^src\/controllers\/(generation|model|nsfw|public-api-v1)/,
  /^docs\/openapi\//,
  /^src\/server\.js$/,
];

const CHANGELOG = "docs/API_CHANGELOG.md";

if (process.env.SKIP_API_CHANGELOG_VERIFY === "1") {
  console.log("[verify-api-changelog] skipped (SKIP_API_CHANGELOG_VERIFY=1)");
  process.exit(0);
}

function diffNames() {
  const base = process.env.GIT_BASE_RANGE || "";
  try {
    execSync("git rev-parse --is-inside-work-tree", { cwd: ROOT, stdio: "pipe" });
  } catch {
    return "";
  }

  let out = "";
  try {
    if (base) {
      return execSync(`git diff --name-only ${base}`, {
        cwd: ROOT,
        encoding: "utf8",
      });
    }
    out += execSync("git diff --name-only HEAD", { cwd: ROOT, encoding: "utf8" }) || "";
    out += execSync("git diff --name-only --cached", { cwd: ROOT, encoding: "utf8" }) || "";
    const st = execSync("git status --porcelain=v1", { cwd: ROOT, encoding: "utf8" });
    for (const line of st.split("\n")) {
      if (line.length < 4) continue;
      const name = line.slice(3).trim();
      if (!name || name.includes(" -> ")) continue;
      out += name + "\n";
    }
    return out;
  } catch {
    return out;
  }
}

const touched = [...new Set(diffNames().split("\n").map((s) => s.trim()).filter(Boolean))];
if (touched.length === 0) {
  process.exit(0);
}

const normalized = (f) => f.replace(/\\/g, "/");

const needsChangelog = touched.some((f) =>
  TRIGGERS.some((re) => re.test(normalized(f)))
);
const changelogGit = touched.some(
  (f) => normalized(f) === CHANGELOG || normalized(f).endsWith("/" + CHANGELOG)
);

if (needsChangelog && !changelogGit) {
  console.error(
    "\n❌ API integration files changed; update docs/API_CHANGELOG.md ([Unreleased])\n" +
      "   or set SKIP_API_CHANGELOG_VERIFY=1.\n",
  );
  process.exit(1);
}

console.log("[verify-api-changelog] OK");
