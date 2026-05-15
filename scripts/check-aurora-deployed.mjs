import { chromium } from "playwright";

const URL = process.argv[2] || "https://mdcln-testing.vercel.app/__design__";
const THEME = process.argv[3] || "dark";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();

// Seed theme BEFORE navigation so initial paint already uses it.
await page.addInitScript((theme) => {
  try {
    localStorage.setItem("theme", theme);
    localStorage.setItem("ui-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.add(theme);
  } catch {}
}, THEME);

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForLoadState("load", { timeout: 30_000 }).catch(() => {});

await page
  .waitForFunction(
    () => !document.querySelector('[data-splash="true"]'),
    null,
    { timeout: 20_000 },
  )
  .catch(() => {});

await page.waitForTimeout(10_000);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

await page.screenshot({
  path: `scripts/aurora-deploy-${THEME}.png`,
  fullPage: false,
  clip: { x: 0, y: 0, width: 1440, height: 900 },
});
console.log(`Saved scripts/aurora-deploy-${THEME}.png (top viewport)`);

const sectionCount = await page.evaluate(() => document.querySelectorAll("section").length);
const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const html = await page.evaluate(() => ({
  theme: document.documentElement.getAttribute("data-theme"),
  classes: document.documentElement.className,
}));
console.log({ sectionCount, bodyBg, html });

await browser.close();
