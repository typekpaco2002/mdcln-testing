# Documentation coverage index (ModelClone)

Single entry point for **what is documented** and **how to keep it current**.  
Narrative architecture: root **`AGENTS.md`**.  
Stripe deep-dives: **`docs/STRIPE_DUAL_ACCOUNT.md`**, **`docs/STRIPE_WEBHOOK.md`**, **`docs/STRIPE_CHECKOUT_WEBHOOK_FULL.md`**.

## Regenerate inventories (required after relevant code changes)

```bash
npm run docs:registry
```

Commit updated files under **`docs/generated/`** in the **same branch** as the code change.

## Generated inventories (near–exhaustive)

| File | Contents |
|------|-----------|
| `docs/generated/HTTP_ROUTES.md` | Every **literal** `router./app.` `get|post|put|patch|delete|use('/path'` in `src/server.js` + `src/routes/**/*.js` |
| `docs/generated/API_GENERATION_CATALOG.md` | Generation/media routes (filtered) + **`/api/v1`** equivalents || `docs/generated/PRISMA_MODELS.md` | All Prisma **`model`** blocks + parsed field identifiers |
| `docs/generated/BACKEND_MODULES.md` | Controllers, services, middleware, **`src/lib`**, route file tree, **`shared/`** |
| `docs/generated/CLIENT_PAGES.md` | All **`client/src/pages/**/*.jsx`** + static `<Route path>` lines from **`client/src/App.jsx`** |
| `docs/generated/CLIENT_HOOKS_FLOWS_NODES.md` | `client/src/hooks/**/*` + **`components/flows/nodes/**/*`** |
| `docs/generated/CLIENT_COMPONENTS.md` | All **`client/src/components/**/*`** matching `.jsx`, `.tsx`, `.js`, `.ts`, `.css`, `.scss` |
| `docs/generated/SCRIPTS.md` | All **`scripts/**/*`** matching `.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.cts`, `.py`, `.sql`, `.sh`, `.json`, `.md` |
| `docs/generated/CLIENT_STORE.md` | `client/src/store/**/*` |

### Known gaps in automatic route extraction

- **Multi-line** route definitions (`router.post(\n  '/foo'`).
- **Template literals** or **dynamic** paths.
- Middleware-only registration.

For those, append a bullet under **Manual supplement** below or extend `scripts/generate-registry.mjs`.

## Manual supplement (non-generated prose)

Maintain in **`AGENTS.md`** sections 2+, product rules, onboarding, credit invariants.

Binary assets under `client/` (e.g. images, video) are **not** listed — only text/source extensions above.

See **`docs/API_REFERENCE.md`** and **`docs/API_PUBLIC_LAUNCH.md`**: versioning (`/api/v1` mirror), **`docs/openapi/v1.openapi.yaml`**, **`docs/API_CHANGELOG.md`**, **`docs/generated/API_GENERATION_CATALOG.md`**, auth (**`mcl_`** vs session), throttles (**`GENERATION_MAX_IN_FLIGHT_PER_USER`**, `rateLimiter.js`).

## Playwright / E2E

Add a **`docs/generated/PLAYWRIGHT.md`** (or extend this script) once test files live in-repo under a stable glob.
