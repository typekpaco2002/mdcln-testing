import { chromium } from "playwright";
import sharp from "sharp";

const URL = "https://mdcln-testing.vercel.app/__design__";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem("mc-theme", "dark"));
await page.goto(URL, { waitUntil: "networkidle", timeout: 30_000 });
await page.waitForTimeout(8_000);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } });
const img = sharp(buf);
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

const px = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};

console.log("size:", info.width, "x", info.height, "channels:", info.channels);
console.log("Pixel at (200, 100) — header area:        ", px(200, 100));
console.log("Pixel at (1200, 80)  — empty header area: ", px(1200, 80));
console.log("Pixel at (1200, 400) — empty page right:  ", px(1200, 400));
console.log("Pixel at (1200, 700) — empty page right:  ", px(1200, 700));
console.log("Pixel at (50, 600)   — empty page left:   ", px(50, 600));
console.log("Pixel at (720, 850)  — empty page bottom: ", px(720, 850));

await browser.close();
