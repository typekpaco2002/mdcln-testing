# Aurora UI redesign — glass + violet glow + fluid motion

**Date:** 2026-05-15
**Branch(es):** `main`
**Outcome:** done (Phase 1+2+3 shipped; Login/Signup polish + admin pages deferred)
**Pushed to:** `typekpaco` (`typekpaco2002/mdlcln@main`) + `mtesting` (`mconqeuroror/mdcln-testing@main`)

## User request

Rolling brief across the session:

1. Push every page + every component state of ModelClone into the existing Figma file `https://www.figma.com/design/tJfPVfH8tTAzyHcQqpNZqv/modelclone` so it can be iterated on visually.
2. Then: refactor the actual codebase to a **clean minimalistic glass-like translucent UI with subtle dark violet radial glows, fluid animations and glass elements, maximal aestheticness and professionalism — across the whole UI**, both bright and dark modes.
3. Treat it as a real shipping refactor, not a mockup — everything must land in the running app.

## What changed

**Aurora design foundation (`196fee7`):**
- Appended ~370 lines to `client/src/index.css` introducing the Aurora token system: `--glass-fill/-strong/-elevated`, `--glass-blur-sm/md/lg/xl`, `--glow-violet-soft/-deep`, `--ease-spring/-smooth`, `--motion-fast/-medium/-slow`, `--shadow-glass-sm/-md/-lg`, theme-aware `--glow-faint/-medium/-strong`.
- `body::before` paints a fixed-position ambient violet aurora behind every page.
- New utility classes: `.glass`, `.glass-strong`, `.glass-elevated`, `.glass-rim`, `.glow-violet`, `.glow-pulse`, `.motion-spring`, `.motion-lift`, `.motion-press`, `.motion-enter`, `.motion-stagger`, `.motion-float`, `.motion-shimmer`. All respect `prefers-reduced-motion`.
- Existing primitives `.panel` / `.btn-primary` / `.btn-accent` / `.btn-outline` upgraded to the new glass + motion vocabulary.

**Aurora React primitives (`196fee7`):**
- New file `client/src/components/ui/glass.jsx`: `GlassPanel`, `GlassCard`, `GlassButton`, `RadialGlow`, `FluidMotion`, `FluidStagger`, `AuroraBackdrop`. All theme-aware via the token system; variants match existing `.btn-*` names so they slot in anywhere.

**Light-mode adapters (`a1a039f`):**
- Comprehensive CSS scoped under `html[data-theme="light"]`/`html.light` mapping every common hardcoded `text-white/N`, `bg-white/[0.0X]`, `border-white/N`, hover variants, `bg-black`, `bg-slate-{800,900}` Tailwind class to perceptually-equivalent slate values so legacy components render properly in light mode without per-file edits.
- Smooth crossfade transitions limited to `html`, `body`, and common interactive elements (`button`, `a`, `input`, `textarea`, `select`, `.panel`, `.glass*`, `.btn-*`) — avoided the global `*` transition trap that causes initial-render jank.

**Dark-mode wash-out fix (`171bf7a`):**
- The first deploy rendered dark mode as a milky pale-violet sheet because `body::before` ambient (12-22 % lavender) was compounding with `AuroraBackdrop` blobs (also 20 %) plus shadows on focused elements.
- Cut dark `--glow-faint/medium/strong` from 5 / 12 / 22 % to **1.8 / 4 / 8.5 %**.
- Reduced `body::before` from 3 stacked gradients to 2, pushed corners further off-screen.
- `RadialGlow` blobs: per-hue intensity table maxing at 12 % (was flat 20), bumped blur 40 → 60 px, added `mix-blend: screen` so blobs add light over dark instead of painting violet on top.
- Removed the redundant `<AuroraBackdrop>` from `DesignSystemPage` (`body::before` already paints ambient).

**Sidebar + chrome glassmorphism (`5d871e5`):**
- Made `--sidebar-bg` translucent (72 % dark / 78 % light) and gave `aside.fixed.left-0` a 22 px backdrop-blur + 150 % saturate + soft right shadow — no JSX edits required.
- Upgraded `.mc-glass`, `.mc-glass-strong`, `.mc-glass-card`, `.mc-glass-nav`, `.mc-glass-toast` from opaque `var(--bg-*)` to `var(--glass-fill-*)` with proper backdrop blurs.
- Apple-Vision-Pro-style inner highlight via gradient pseudo (`mix-blend overlay`, 24-76 % transparent middle band) on every `.mc-glass*` surface.
- Sidebar nav-item hover gets glass-border-strong feedback. Honors `prefers-reduced-motion`.

**LandingPage hero + Footer cohesion (`4d7ba95`):**
- LandingPage hero ambient blob replaced with two Aurora radial halos (10 % violet + 6 % deep purple) using `mixBlendMode: screen`.
- `Footer` switched from opaque `var(--bg-page)` to `glass-fill-strong` with 24 px blur + soft top-edge violet wash for visual continuity from hero through page bottom.

**Figma push pipeline (carried from previous session, `7704bd6`):**
- `scripts/push-to-figma.mjs` + `npm run figma:push` — drives Playwright to inject Figma's `capture.js`, bypasses CSP, seeds theme via `localStorage`/`data-theme`, races `captureForDesign` against a 25 s timeout (the upstream promise doesn't always resolve cleanly).
- Manifest (`scripts/figma-captures.json`, gitignored) maps `(route, theme)` → `(captureId, endpoint)`.
- Pushed **8 captures total** (2 versions × 2 themes × 2 routes) into the user's Figma file at `tJfPVfH8tTAzyHcQqpNZqv`:
  - v1 nodes (pre-fix): `140-843`, `141-843`, `142-843`, `143-843`
  - v2 nodes (post-fix, current state of truth): `144-843`, `145-843`, `146-843`, `147-843`

## Touched files

- `client/src/index.css` — Aurora section (~600 net new lines)
- `client/src/components/ui/glass.jsx` — new file, ~300 lines
- `client/src/pages/DesignSystemPage.jsx` — Aurora showcase + helper polish
- `client/src/pages/LandingPage.jsx` — hero ambient halos
- `client/src/components/Footer.jsx` — glass surface + top-edge violet wash
- `scripts/push-to-figma.mjs`, `scripts/check-aurora-deployed.mjs`, `scripts/inspect-glow.mjs`, `scripts/sample-pixels.mjs`, `scripts/find-paler.mjs` — capture + verify pipeline

No backend, no API, no Prisma — pure client + dev tooling.

## Where it landed in Figma

File: https://www.figma.com/design/tJfPVfH8tTAzyHcQqpNZqv/modelclone

| Frame | Direct link |
|---|---|
| `/__design__` dark (current) | [node 144-843](https://www.figma.com/design/tJfPVfH8tTAzyHcQqpNZqv?node-id=144-843) |
| `/` landing dark (current) | [node 145-843](https://www.figma.com/design/tJfPVfH8tTAzyHcQqpNZqv?node-id=145-843) |
| `/__design__` light (current) | [node 146-843](https://www.figma.com/design/tJfPVfH8tTAzyHcQqpNZqv?node-id=146-843) |
| `/` landing light (current) | [node 147-843](https://www.figma.com/design/tJfPVfH8tTAzyHcQqpNZqv?node-id=147-843) |

Old v1 frames (`140-143`) kept as a before/after reference; can be deleted once user has reviewed.

## Open follow-ups

1. **Authenticated route captures** — need `npm run figma:auth-state` to log in once, then the same pipeline can sweep `/dashboard`, `/dashboard?tab=*`, `/admin`, `/nsfw`, `/flows`, `/pro/*`, `/upscaler`, `/reformatter`, etc.
2. **Login/Signup pages** — small visual polish pass for cohesion (currently inheriting cascade only).
3. **Admin / Pro layout chrome** — same token-driven approach should make these read as glass without per-file edits, but worth a verification capture round.
4. **Re-push DashboardPage capture** once the chrome upgrade is live and authenticated captures are wired up.
