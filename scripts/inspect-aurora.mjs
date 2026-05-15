import { chromium } from "playwright";

const URL = process.argv[2] || "https://mdcln-testing.vercel.app/__design__";
const THEME = process.argv[3] || "dark";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript((t) => {
  localStorage.setItem("theme", t);
  localStorage.setItem("ui-theme", t);
}, THEME);
await page.goto(URL, { waitUntil: "networkidle", timeout: 30_000 });
await page.waitForTimeout(10_000);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

const report = await page.evaluate(() => {
  const out = { viewportPixel: null, body: {}, root: {}, layers: [] };
  const sample = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: el.className?.toString?.() || "",
      bg: cs.backgroundColor,
      bgImage: cs.backgroundImage.slice(0, 80),
      pos: cs.position,
      z: cs.zIndex,
      filter: cs.backdropFilter || cs.webkitBackdropFilter || "",
      opacity: cs.opacity,
      rect: el.getBoundingClientRect(),
    };
  };
  const points = [
    [200, 100], [720, 100], [720, 400], [720, 700], [200, 700], [1200, 700],
  ];
  out.viewportPixel = points.map((p) => ({ point: p, info: sample(p[0], p[1]) }));
  out.body = {
    bg: getComputedStyle(document.body).backgroundColor,
    bgImage: getComputedStyle(document.body).backgroundImage.slice(0, 80),
  };
  out.root = {
    bg: getComputedStyle(document.documentElement).backgroundColor,
    theme: document.documentElement.getAttribute("data-theme"),
  };
  // Find any full-bleed layer that might be milky
  const fixed = Array.from(document.querySelectorAll("*")).filter((el) => {
    const cs = getComputedStyle(el);
    return cs.position === "fixed" && el.offsetWidth >= 1200 && el.offsetHeight >= 700;
  });
  out.layers = fixed.slice(0, 12).map((el) => {
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: (el.className?.toString?.() || "").slice(0, 100),
      bg: cs.backgroundColor,
      bgImage: cs.backgroundImage.slice(0, 100),
      filter: cs.backdropFilter || cs.webkitBackdropFilter || "",
      z: cs.zIndex,
      w: el.offsetWidth,
      h: el.offsetHeight,
    };
  });
  return out;
});

console.log(JSON.stringify(report, null, 2));
await browser.close();
