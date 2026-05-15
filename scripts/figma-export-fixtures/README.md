# Figma Export — API Fixtures

Static JSON responses used by `scripts/export-figma-html.mjs` to mock every
`/api/**` call during a Figma export. **No DATABASE_URL needed**; the SPA
sees a deterministic backend and renders pretty mock data.

## How it works

1. Playwright registers `context.route('**/api/**', ...)`.
2. The handler matches the request URL against patterns in `_index.js`
   (in declaration order — first match wins).
3. The matched fixture's JSON is returned with HTTP 200.
4. Unmatched API calls fall through to a default empty `200 {}` (logged).

## Adding a new fixture

1. Drop a `<name>.json` file in this folder.
2. Add an entry to `_index.js` mapping a URL regex/glob to the file.
3. Re-run `npm run figma:export:full`.

## Editing existing fixtures

The fixtures here aim to show the UI in a healthy, populated state (a few
models, a few generations, plenty of credits, no errors). If the UI changes
its expected shape, update the fixture — don't change real DB rows.
