import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "docs");
const outFile = path.join(outDir, "Fix-Session-Summary-and-Replit-Runbook.pdf");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 50, left: 55, right: 55, bottom: 50 },
  info: {
    Title: "ModelClone Fix Session Summary + Replit Runbook",
    Author: "ModelClone Engineering",
    Subject: "Ordered technical summary and deployment instructions",
  },
});

doc.pipe(fs.createWriteStream(outFile));

const colors = {
  title: "#0f172a",
  h1: "#111827",
  h2: "#1f2937",
  text: "#374151",
  muted: "#6b7280",
  codeBg: "#f3f4f6",
};

function title(text) {
  doc.fillColor(colors.title).font("Helvetica-Bold").fontSize(20).text(text);
  doc.moveDown(0.3);
  doc.moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .lineWidth(1)
    .strokeColor("#d1d5db")
    .stroke();
  doc.moveDown(0.6);
}

function h1(text) {
  doc.fillColor(colors.h1).font("Helvetica-Bold").fontSize(14).text(text);
  doc.moveDown(0.25);
}

function h2(text) {
  doc.fillColor(colors.h2).font("Helvetica-Bold").fontSize(11.5).text(text);
  doc.moveDown(0.2);
}

function p(text) {
  doc.fillColor(colors.text).font("Helvetica").fontSize(10).text(text, { lineGap: 2 });
  doc.moveDown(0.35);
}

function bullets(items) {
  for (const item of items) {
    doc.fillColor(colors.text).font("Helvetica").fontSize(10).text(`• ${item}`, { lineGap: 2, indent: 10 });
  }
  doc.moveDown(0.35);
}

function code(text) {
  const x = doc.page.margins.left;
  const y = doc.y;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const lines = text.split("\n");
  const lineHeight = 12;
  const height = lines.length * lineHeight + 18;

  doc.save();
  doc.rect(x, y, width, height).fill(colors.codeBg);
  doc.restore();

  doc.fillColor("#111827").font("Courier").fontSize(8.5);
  let yy = y + 9;
  for (const line of lines) {
    doc.text(line, x + 10, yy, { lineBreak: false });
    yy += lineHeight;
  }
  doc.y = y + height + 8;
}

function pageBreakIfNeeded(minSpace = 120) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - minSpace) {
    doc.addPage();
  }
}

title("ModelClone Fix Session Summary + Replit Runbook");
p("Date: 2026-03-04");
p("Purpose: Provide a clean, ordered summary of the fixes completed during the debugging session, plus a safe Replit deployment/migration procedure.");

h1("1) Root Cause Overview");
bullets([
  "Main production instability came from Prisma schema/provider mismatch (SQLite-style local assumptions vs PostgreSQL runtime/client expectations).",
  "This mismatch caused PrismaClientValidationError, especially around payment-adjacent paths and draft payloads.",
  "Secondary critical issues were checkout interactivity, crypto webhook reliability, LoRA training flow robustness, and referral attribution/reporting consistency.",
]);

h1("2) Major Fixes Completed");
h2("2.1 Database + Prisma Consistency");
bullets([
  "Schema and runtime behavior were aligned to PostgreSQL-compatible expectations.",
  "Draft and payload paths were adjusted to support Json/String[] data correctly.",
  "AgeRange migration to explicit age model was propagated with guardrails (age >= 18).",
]);

h2("2.2 Checkout / Payments Stability");
bullets([
  "Checkout modal hoisting bug fixed (finalizePayment/handlers initialized before use).",
  "Card interaction blocking fixed via z-index/pointer-events hardening and modal isolation.",
  "Hosted checkout fallback added to avoid dead-end when Stripe card iframe fails to initialize.",
  "Flow confirmed for one-time, subscription, and $6 special-offer funnel paths.",
]);

h2("2.3 Crypto Payments Reliability");
bullets([
  "Webhook now uses cryptoPayment.userId from DB record instead of parsing user ID from order string.",
  "Idempotency/race behavior improved for duplicate NOWPayments IPN deliveries.",
  "Referral commission path added for successful crypto purchases.",
  "Companion recovery and DB inspection scripts added: scripts/recover-crypto-payment.mjs and scripts/check-db.mjs.",
]);

h2("2.4 Generation Polling + Refund Policy Hardening");
bullets([
  "Dynamic polling timeout now applies to running/in-progress phases only (queued time does not consume timeout budget).",
  "Refund behavior tightened: immediate refunds only on real provider-side failures; non-provider poll noise does not auto-refund.",
  "Background poller was updated to track running state start for timeout accounting.",
]);

h2("2.5 LoRA Training Reliability + Guardrails");
bullets([
  "Pro training submission now uses 9000 steps as requested.",
  "Standard mode image cap corrected to 15; Pro remains 30.",
  "Training UI + backend lock now happens immediately on submit (prevents accidental double-submit while captioning/zip prep runs).",
  "Delete-while-training now blocked server-side (409) and disabled in UI.",
]);

h2("2.6 Referral Program Improvements");
bullets([
  "Referral capture route now redirects to landing page for conversion flow, while preserving referral code attribution.",
  "Referral dashboard now clearly tracks registration-based referrals (not clicks).",
  "First-sale tracking fields are written on first qualifying purchase, with idempotent behavior.",
]);

h1("3) Safe DB Cleanup Script (savedAppearance age/ageRange)");
p("Use this script in environments where historical savedAppearance JSON may still include age or ageRange keys. It safely removes those keys.");
code(`node -e 'import("./src/lib/prisma.js").then(async ({ default: prisma }) => {
  const models = await prisma.savedModel.findMany({
    where: { savedAppearance: { not: null } },
    select: { id: true, savedAppearance: true }
  });
  let fixed = 0;
  for (const m of models) {
    let sa = m.savedAppearance;
    if (!sa) continue;
    if (typeof sa === "string") { try { sa = JSON.parse(sa); } catch { continue; } }
    if (sa && typeof sa === "object" && !Array.isArray(sa) && ("ageRange" in sa || "age" in sa)) {
      const { ageRange, age, ...clean } = sa;
      await prisma.savedModel.update({ where: { id: m.id }, data: { savedAppearance: clean } });
      fixed++;
    }
  }
  console.log("Done. Fixed", fixed, "models.");
  await prisma.$disconnect();
}).catch((e) => { console.error(e); process.exit(1); });'`);

pageBreakIfNeeded(220);
h1("4) Replit Pull + Safe Mount Runbook");
h2("4.1 Preflight");
bullets([
  "Back up production database before applying schema/data changes.",
  "Ensure Replit secrets are set (DATABASE_URL PostgreSQL, Stripe keys, webhook secrets, xAI/fal/RunPod/WaveSpeed keys, R2, email keys).",
  "Do NOT use SQLite schema or local dev DB artifacts in Replit runtime.",
]);

h2("4.2 Pull + Install");
code(`git fetch origin
git checkout main
git pull origin main
npm ci`);

h2("4.3 Prisma Safety Procedure");
bullets([
  "First generate Prisma client against production schema/env.",
  "Then apply schema changes safely with db push (or migrate deploy if your repo uses migrations).",
  "Run optional data cleanup script for savedAppearance normalization.",
]);
code(`npx prisma generate
npx prisma db push
# optional cleanup
node -e '/* cleanup script from section 3 */'`);

h2("4.4 Build + Start");
code(`npm run build
npm run start`);

h2("4.5 Post-Deploy Smoke Test Checklist");
bullets([
  "Auth: signup/login/verify works.",
  "Checkout: subscription + one-time card flow works; fallback checkout works.",
  "Crypto: create invoice works; webhook reachable from public URL; credits are applied.",
  "$6 funnel: payment + image/model generation path works; no duplicate photo issue.",
  "Prompt enhancement: all modes use Grok and handle refunds correctly on failure.",
  "LoRA: standard cap=15, pro cap=30, immediate lock, no delete during training.",
  "Referrals: /r/:code lands on landing page; registration-based counts visible in referral dashboard.",
]);

h1("5) Operational Notes");
bullets([
  "Never commit .env or local SQLite dev.db.",
  "Keep webhook endpoints publicly reachable in production (localhost webhook tests are expected to fail externally).",
  "Use recovery scripts only as manual/admin tooling; keep normal path webhook-driven and idempotent.",
]);

doc.moveDown(1);
doc.fillColor(colors.muted).font("Helvetica-Oblique").fontSize(8.5)
  .text("End of report.", { align: "center" });

doc.end();

doc.on("end", () => {
  // no-op
});

process.on("beforeExit", () => {
  console.log(`PDF written: ${outFile}`);
});
