import { chromium } from "playwright";

const URL = "https://mdcln-testing.vercel.app/__design__";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem("mc-theme", "dark");
});
await page.goto(URL, { waitUntil: "networkidle", timeout: 30_000 });
await page.waitForTimeout(8_000);

const probe = await page.evaluate(() => {
  const s = getComputedStyle(document.documentElement);
  return {
    glowFaint:  s.getPropertyValue("--glow-faint").trim(),
    glowMedium: s.getPropertyValue("--glow-medium").trim(),
    glowStrong: s.getPropertyValue("--glow-strong").trim(),
    glassFill:  s.getPropertyValue("--glass-fill").trim(),
    bgPage:     s.getPropertyValue("--bg-page").trim(),
    bodyBg:     getComputedStyle(document.body).backgroundColor,
    bodyBefore: getComputedStyle(document.body, "::before").background.slice(0, 200),
    htmlClass:  document.documentElement.className,
    htmlTheme:  document.documentElement.getAttribute("data-theme"),
  };
});
console.log(JSON.stringify(probe, null, 2));

await browser.close();
