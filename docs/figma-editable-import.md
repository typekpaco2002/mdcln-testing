# Editable Figma Import (ModelClone)

Pipeline that exports the entire ModelClone UI — every page, every reusable
component, in **both light and dark themes** — as static HTML you can import
into Figma via the [`html.to.design`](https://html.to.design) plugin to get
real, editable Figma frames.

## TL;DR

```bash
# 1. Start the dev server (Vite + Express on http://localhost:5000)
npm run dev

# 2. In another terminal, run the full export
npm run figma:export:full
```

That's it. Output lands in `figma-static/export-YYYYMMDD-HHMMSS/` with this
structure:

```
figma-static/export-20260515-201500/
├── manifest.json                 ← inventory of every export
├── home/
│   ├── light/index.html + preview.png
│   └── dark/index.html + preview.png
├── dashboard/
│   ├── light/index.html + preview.png
│   └── dark/index.html + preview.png
├── design-system/                ← every reusable UI component
│   ├── light/index.html + preview.png
│   └── dark/index.html + preview.png
└── …one folder per route
```

## Why this works without a database

The exporter mocks every `/api/**` request in Playwright with deterministic
fixtures from `scripts/figma-export-fixtures/`. The SPA never knows it's
talking to a fake backend — it renders pretty mock data (a fake admin user,
3 fake models, 5 fake generations, etc.) and the export captures the
healthy state of the UI.

**No `DATABASE_URL` needed. No risk to any real data.**

## Available scripts

| Command | What it does |
|---------|--------------|
| `npm run figma:export` | Public routes only, light + dark, mocked APIs |
| `npm run figma:export:full` | **Recommended.** Every route (incl. auth/admin/pro), light + dark, mocked APIs |
| `npm run figma:export:html:auth` | Legacy mode: real backend + Playwright storage state. Needs `npm run figma:auth-state` first |
| `npm run figma:auth-state` | Records a logged-in Playwright storage state (only needed for the legacy mode above) |

## Importing into Figma

1. Install the **`html.to.design`** plugin in Figma.
2. Start a static server inside the export folder so the plugin can fetch the HTML files:

```bash
npx serve "figma-static/export-20260515-201500"
```

3. In Figma, open `html.to.design` and import each of these URLs (one per route × theme):

```
http://localhost:3000/<route>/light/index.html
http://localhost:3000/<route>/dark/index.html
```

4. The plugin reconstructs each page as a Figma frame with editable text,
   colors, and images.

Use `manifest.json` to script the import or to know which routes succeeded.

## Adding the design system to Figma

The `/__design__` route is captured automatically. It shows:

- Typography scale
- Color tokens (CSS custom properties)
- Buttons (primary, secondary, ghost, destructive, disabled, loading, with-icon)
- Inputs (default, disabled, readonly, textarea, checkboxes)
- Badges (all 6 variants)
- Cards (with status, with icon, with action)
- Stat tiles
- Toast previews

Importing the `design-system/light/index.html` and `design-system/dark/index.html`
files into a single Figma page gives you a "design system" frame side-by-side
in both themes.

## Coverage

Routes are **auto-discovered** from `client/src/App.jsx` — no manual list to
maintain. When you add a new `<Route path="..."/>`, the next export picks it
up automatically.

`:id`, `:suffix`, `:slug` parameters are filled with the value `demo`. To
export specific real values, override with `--routes-file` (see flags below).

## Re-running after UI changes

Just re-run `npm run figma:export:full` and re-import. Old exports are kept
in their own timestamped folders so you can diff or roll back.

## Editing the mock data

Fixtures live in `scripts/figma-export-fixtures/`. Each `<name>.json` is the
HTTP 200 body returned for one URL pattern (mapped in `_index.js`). Edit the
JSON to change what the UI renders — for example, bump `models.json` to 8
models, or set `me.json`'s `credits: 0` to capture the empty state.

See `scripts/figma-export-fixtures/README.md` for the full schema.

## Flags (raw script)

```
node scripts/export-figma-html.mjs \
  --base-url http://localhost:5000 \
  --themes light,dark \
  --include-auth \
  --width 1512 \
  --height 982 \
  --routes /dashboard,/nsfw \
  --skip-routes /verify \
  --pause-ms 1500
```

Add `--skip-mocks` to disable API mocking and use a real backend. In that
mode you usually want `--storage-state scripts/figma-auth-state.json` so
auth-gated routes don't redirect to /login.

## Notes / limitations

- The `html.to.design` plugin is the most editable auto-import path, but
  not perfect 1:1 with the React source. Complex animations and dynamic
  states will need manual cleanup.
- Sticky/floating UI (toasts, splash screen, support button) may capture
  in odd positions; ignore in the imported Figma frames.
- The `/__design__` route is hidden on `modelclone.app` (production
  hostname check in `client/src/App.jsx`); it's available on localhost,
  Vercel preview, and the testing host.

## Troubleshooting

**Route shows blank page.** The fixture for one of its API calls is
missing. Run the export with terminal visible — `[mock] unmatched <path>`
warnings will tell you exactly which endpoint to add a fixture for.

**Page shows error toast on load.** Same as above — usually a fixture
returned an unexpected shape. Edit the relevant `.json` to match.

**`html.to.design` plugin returns garbled fonts.** Make sure the static
server (`npx serve ...`) is reachable from your machine and the export
folder contains the inlined CSS (it should — the script appends a `<style>`
tag to `<head>` with all same-origin rules).
