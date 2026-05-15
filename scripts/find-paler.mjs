import { chromium } from "playwright";

const URL = "https://mdcln-testing.vercel.app/__design__";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem("mc-theme", "dark"));
await page.goto(URL, { waitUntil: "networkidle", timeout: 30_000 });
await page.waitForTimeout(8_000);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

// Walk every element under (1200, 400) using elementsFromPoint to see the stack.
const stack = await page.evaluate(() => {
  const els = document.elementsFromPoint(1200, 400);
  return els.slice(0, 12).map((el) => {
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: (el.className?.toString?.() || "").slice(0, 80),
      id: el.id || null,
      bg: cs.backgroundColor,
      bgImg: cs.backgroundImage.slice(0, 60),
      pos: cs.position,
      z: cs.zIndex,
      filter: cs.backdropFilter || cs.webkitBackdropFilter || cs.filter || "",
      blendMode: cs.mixBlendMode,
      opacity: cs.opacity,
      pointerEvents: cs.pointerEvents,
      w: el.offsetWidth,
      h: el.offsetHeight,
    };
  });
});

console.log(JSON.stringify(stack, null, 2));
await browser.close();
