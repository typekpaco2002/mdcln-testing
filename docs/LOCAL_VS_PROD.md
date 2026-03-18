# Why the app can behave differently locally vs production

## Production (works)

- **Same origin**: Frontend and API are served from the same domain (e.g. `https://yourapp.com`). Cookies (`auth_token`, `refresh_token`) are sent with every request.
- **Auth flow**: User logs in → server sets HTTP-only cookies → subsequent requests include cookies → 401 only when token is truly invalid/expired → refresh or redirect to login once.
- **No Vite**: Built static files, no HMR, no dev-only plugins. Errors are handled by your ErrorBoundary without Replit-specific overlays.

## Local (refresh loop / odd behavior)

- **Stale auth in localStorage**: Zustand persists `auth-storage`. If you previously logged in on prod (or had a session), that state can rehydrate so the app thinks you're logged in. The **cookie** is not sent to `localhost` (different origin from prod) or may be missing, so API calls return **401**. The app then tries to “fix” the session (refresh, force-logout, redirect), which can repeat and look like a loop.
- **CORS**: If `VITE_API_URL` pointed at production, the browser would send requests to prod from `localhost`; prod often does not allow `localhost` in CORS, so requests fail with no response body (network/CORS error). The client now overrides to `localhost` when the app is served from localhost to avoid that.
- **Auth handling on localhost**: To avoid loops, when the app is served from **localhost** or **127.0.0.1**:
  - **401s** are not used to run token refresh or force-logout.
  - **Force-logout** never triggers redirect to `/login`.
  So you may see failed requests or “logged out” behavior even though localStorage still has old auth; the app will not repeatedly redirect.
- **Replit dev overlay**: The Replit runtime error overlay is only enabled when `REPL_ID` is set (i.e. on Replit). On local Windows/Mac it is disabled so the default Vite overlay is used and to avoid reload/error-handling differences that can look like a loop.

## What to do locally

1. **Clear site data** for `http://localhost:5006`: DevTools → Application → Local Storage → Clear. Then reload. This removes stale `auth-storage` so the app starts as logged out.
2. **Use the same backend**: Ensure the app talks to your local API (e.g. `VITE_API_URL=http://localhost:5006`). The client forces this when it detects it’s on localhost.
3. **Log in again**: After clearing storage, log in on localhost so the local server sets cookies; then protected routes and API calls should work like prod.
